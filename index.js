// Console //
const print = console.log
const print_warn = console.warn
const print_debug = console.debug
const print_error = console.error
// Discord //
const BLUBOT_ID = "705347670054666260"
const BLUAXOLOTL_ID = "229319768874680320"
var CachedMessages = []
const Discord = require('discord.js')
const NewDiscord = require('discord.js-modern')
const Intents = NewDiscord.Intents
const new_client = new NewDiscord.Client({intents: Object.keys(Intents.FLAGS)})
const client = new_client
// const config = require('./config.json')
const { parser, htmlOutput, toHTML } = require('discord-markdown')
var prev_req_channel = null
// Server //
var Sockets = new Map()
var BackChannels = new Map()
const express = require('express')
const app = express()
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const datenow = new Date()
var port = 8000
var offset = 0
var no_connections = true
// JSON DATABASE //
// var JSONFileSync = null
// var LowSync = null
// var adapter = null
var db = null
var BlockedUsers = null
var BlockedChannels = null
var Nicknames = null
var Usernames = new Map()
// Process Env //
require('dotenv').config()
const token = process.env["token"]
// Misc. Modules //
var request = require('sync-request')
const date = require('date-and-time')
const TextParser = require("./text_parser.js").parser
const emotes = require("./website/emote.js")
const path = require('path')
var ab2str = require('arraybuffer-to-string')
var based = require('base64-arraybuffer')
var mime = require('mime-types')
var moment = require('moment-timezone')
var ImageUpload = {}

//// Functions ////
Array.prototype.remove = function (value) {
  let index = this.indexOf(value);
  if (index > -1) {
    this.splice(index, 1)
  }
  return value;
}

function removeItemOnce(arr, value) {
  var index = arr.indexOf(value);
  if (index > -1) {
    arr.splice(index, 1);
  }
  return arr;
}

async function request_channel(socket, channel_id) {
	db_read()
	prev_req_channel = channel_id
	if (Sockets.has(socket)) {
		var channel = Sockets.get(socket)
		BackChannels.set(socket, channel)
	}
	Sockets.set(socket, channel_id)
	let loaded_channel = false
	var channel = await new_client.channels.fetch(channel_id)
	while (channel == null) {
		channel = await new_client.channels.fetch(channel_id)
	}
	let messages = await channel.messages.fetch({ limit: 25 })
	let channel_object = new SocketChannel(channel)
	let message_array = messages.map(message => new SocketMessage(message, socket))
	let guilds_array = new_client.guilds.cache.map(guild => new SocketGuild(guild))
	message_array.sort(function (a, b) {
		return a.timestamp.sort - b.timestamp.sort
	})
	socket.emit('CHANNEL_INIT', guilds_array, channel_object, message_array)
}

function reload_channel(socket) {
	var channel = Sockets.get(socket)
	if (channel != null) {
		request_channel(socket, channel)
	} else if (prev_req_channel != null) {
		request_channel(socket, prev_req_channel)
		print("\n\n==> Defaulted to last requested channel (probably due to frontend script reset 🥴)\n\n")
	} else {
		print("\n\n==> NO CHANNEL AT ALL\n\n")
	}
}

async function con_command(socket, line) {
	if (line.startsWith("/")) { line = line.substring(1) }
	if (socket == null) { sockets[0] }
	var args = line.split(" ")
	var command_name = args.shift()
	switch (command_name) {
		case 'goto':
			if (Number(args[0]) < CachedMessages.length) {
				var msg = CachedMessages[args[0]]
				request_channel(socket, msg.channel.id)
			} else {
				print("\n>>> invalid id :stare:\n")
			}
		break;
		case 'back':
			if (BackChannels.has(socket)) {
				var back_channel = BackChannels.get(socket)
				request_channel(socket, back_channel)	
			} else {
				print("\n\n[ NO BACK CHANNEL ]\n\n")
			}
		break;
		case "jump":
			socket.emit('JUMP_MESSAGE')
		break;
		case 'reload':
			reload_channel(socket)
		break;
		case 'send_embed':
			var channel_id = Sockets.get(socket)
			var json_string = args.join(" ")
			if (json_string == "") { // /send_embed {"title":"This is a test","description": "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.","footer": {"text": "Feet... FEET"},"color":"BLUE"}
				json_string = `{
					"title":"This is a test",
					"description": "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
					"footer": {"text": "Feet... FEET"},
					"color": "BLUE"
				}`
			}
			new_client.channels.fetch(channel_id).then(channel => {
				channel.send({embeds:[JSON.parse(json_string)]})
			})
		break;
		case 'blocked':
			print(db.data.BlockedUsers)
		break;
		case 'uh':
			socket.emit("PRINT_UH")
		break;
		case 'ping':
			var channel = Sockets.get(socket)
			channel = await client.channels.fetch(channel)
			let q_id = String(args.shift())
			if (Usernames.has(q_id)) {
				let n_id = Usernames.get(q_id)
				channel.send(`<@${n_id}> ${args.join(" ")}`)
			} else {
				let mentionee = channel.guild.members.cache.find(member => member.user.tag === String(line.replace("ping ", "")))
				if (mentionee) {
					channel.send(`<@${mentionee.id}>`)
				} else {
					print("\n== INVALID ARGUMENT ==\n")
				}
			}
		break;
		case 'list':
			var channel = Sockets.get(socket)
			channel = await client.channels.fetch(channel)
      channel.guild.members.cache
      .each(member => {
				let usertage = member.user.username
				let text = member.user.tag
				if (Nicknames.has(member.user.id)) {
					text = `${Nicknames.get(member.user.id)} (${member.user.tag})`
				}
				text = (`[${member.user.id}] ` + text)
				switch (member.presence.status) {
					case 'online':
						print(text)
					break
					case 'dnd':
						print(text)
					break
					case 'idle':
						print(text)
					break
					case 'offline':
						print(text)
					break
				}
			})
		break;
		case 'lookup':
			var mode = args.shift()
			switch(mode) {
				case 'user':
					try {
						var user = await new_client.users.fetch(args[0])
						print(`\n\nRESULT >>> ${user.username}`)
					} catch ( err ) {
						print(err)
					}
				break;
				default:
					print("\n\n>>> Idiot, forgot the rest :woozy:\n\n")
				break;
			}
		break;
		default:
			print(`${command_name} ==> Unknown Command`)
	}
}

// function emotify(text) {
// 	return new TextParser(text)
// 				.replaceSurrDict(":", emotes)
// }

function send_convert(content) {
	const searchRegExp = /<br>/gi
	return (content.replace(searchRegExp, "\n"))
}

function db_read() {
	db.read()
	BlockedUsers = db.data.BlockedUsers
	BlockedChannels = db.data.BlockedChannels
	Nicknames = new Map(db.data.Nicknames)

	Nicknames.forEach((i, o) => {
		Usernames.set(i, o)
	})
}

//// Socket.io ////
io.on('connection', (socket) => {

	no_connections = false
	print("! CONNECTION")	

	socket.on('SEND_MESSAGE', async (channel_id, content) => {
		async function simply_send(send_embed, send) {
			if (send_embed) {
				channel.send({embeds: [{description: send}]})
			} else {
				var words = send.split(' ')
				words.forEach((word, index) => {
					if (word.startsWith('\\@')) {
						var new_word = word.replace("\\@", "@")
						words[index] = new_word
					} else if (word.startsWith('@')) {
						var username = word.substring(1)
						var id = Usernames.get(username)
						var new_word = `<@${id}>`
						words[index] = new_word
					}
				})
				channel.send(words.join(" "))
			}
		}
		var send_embed = false
		if (content.startsWith("//")) {
			content = content.substring(1)
		} else if (content.startsWith("/")) {
			con_command(socket, content)
			return
		}
		if (content.startsWith("embed: ")) { send_embed = true }
		let channel = await new_client.channels.fetch(channel_id)
		if (channel.type == "GUILD_PUBLIC_THREAD") {
			if (channel.joined) {
				simply_send(send_embed, send_convert(content))
			} else {
				if (channel.joinable) {
					simply_send(send_embed, send_convert(content))
				} else {
					print("\n==CAN'T JOIN THREAD==\n")
				}
			}
		} else {
			simply_send(send_embed, send_convert(content))
		}
	})

	socket.on('UPLOAD', async (channel_id, data, content) => {
		let channel = await new_client.channels.fetch(channel_id)
		var sfbuff = new Buffer.from(data.split(",")[1], "base64");
		// var sfattach = new Discord.MessageAttachment(sfbuff, "output.png");	
		if (content != "") {
			channel.send(send_convert(content), {
				files: [sfbuff]
			})
		} else {
			channel.send({
				files: [sfbuff]
			})
		}
	})

	socket.on('REPLY', async (channel_id, message_id, content, ping) => {
		let channel = await new_client.channels.fetch(channel_id)
		let message = await channel.messages.fetch(message_id)
		message.reply(send_convert(content))
	})

	socket.on('EDIT', async (channel_id, message_id, content) => {
		let channel = await new_client.channels.fetch(channel_id)
		channel.messages.fetch(message_id).then(message => {
			message.edit(send_convert(content))
		})
	})

	socket.on('DELETE', async (channel_id, message_id, content) => {
		let channel = await new_client.channels.fetch(channel_id)
		channel.messages.fetch(message_id).then(message => {
			message.delete()
		})
	})

	socket.on("RELOAD_CHANNEL", () => {
		reload_channel(socket)
	})

	socket.on('DATA_REQUEST', (id, query, args) => {
		function return_data (data) {
			socket.emit("DATA_REQUEST", id, data)
		 }
		switch (query) {
			case 'nickname':
				let id = args.id
				if (Nicknames.has(id)) {
					return_data(Nicknames.get(id))
				} else {
					return_data(null)
				}
			break;
			case 'blocked':
				return_data(BlockedUsers.includes(args.id))
			break;
		}
	})

	socket.on("USER_BLOCK", (method, id) => {
		switch (method) {
			case 'pop':
				db.data.BlockedUsers.remove(id)
			break;
			case 'append':
				db.data.BlockedUsers.push(id)
			break;
		}
		// print(db.data.BlockedUsers)
		db.write()
		db_read()
	}) 

	socket.on('disconnect', function (socket) { Sockets.delete(socket) })

	new_client.on('messageCreate', function (msg) {
		socket.emit('NEW_MESSAGE', new SocketMessage(msg, socket))
	})

	new_client.on('messageUpdate', function(oldMsg, newMsg) {
		socket.emit('EDIT_MESSAGE', oldMsg, new SocketMessage(newMsg, socket))
	})

	new_client.on('messageDelete', function(msg) {
		socket.emit('DELETE_MESSAGE', new SocketMessage(msg, socket))
	})

	socket.on('REQUEST_MESSAGES', async msg => {
		print("\n==> LOADING MESSAGES... ==>\n")
		if (msg != null) {
			var channel = await client.channels.fetch(msg.channel.id)
			let messages = await channel.messages.fetch({ limit: 25, before: msg.id })
			let message_array = messages.map(message => new SocketMessage(message, socket))
			message_array = message_array.filter(msg => msg.blocked != true)
			socket.emit('PUSH_MESSAGES', message_array)
		} else {
			socket.emit('PUSH_MESSAGES', [])
		}
	})

	socket.on('REQUEST_CHANNEL', channel_id => {
		request_channel(socket, channel_id)
	})

	socket.on("REQUEST_ATTATCHMENT", ath => {
		var https = require('https');
		var count = 0
		socket.emit("OPEN_ATTACHMENT", ath, "init", count)
		print(`\nLOAD ==> '${ath.name}'\n`)

		https.get(ath.url, function(res) {
			res.on('data', function(chunk) {
				var json_string = JSON.stringify(chunk)
				var obj = JSON.parse(json_string)
				socket.emit("OPEN_ATTACHMENT", ath, obj.data, count)
				count++
			});
			res.on('end', function() {
				socket.emit("OPEN_ATTACHMENT", ath, "finished", count)
				print(`\nEMIT ==> '${ath.name}'\n`)
			});
		})
	})

	socket.on('print', stuff => {
		console.log(stuff)
	})
})

//// Discord ////
class SocketUser {
	constructor(usr) {
		this.username = usr.username
		this.tag = usr.tag
		this.id = usr.id
	}
}

class SocketGuild {
	constructor(srv) {
		this.id = srv.id
		this.name = srv.name
		this.nameAcronym = srv.nameAcronym
		var arr = srv.channels.cache.filter(chl => (chl.type == "GUILD_TEXT"))
		arr = arr.map(chl => {
			return {id: chl.id, name: chl.name, pos: chl.rawPosition, type: chl.type, threads: chl.threads.cache.map(thd => new SocketThread(thd)), perms: chl.permissionsFor(new_client.user.id)}
		})
		arr.sort(function(a, b) {
			return a.pos - b.pos;
		})
		this.channels = arr.filter(chl => chl.perms.has("VIEW_CHANNEL"))
	}
}

class SocketThread {
	constructor(thd) {
		this.name = thd.name
		this.id = thd.id
		this.parent = thd.parentId
	}
}

class SocketChannel {
	constructor(chl, dm = false) {
		this.name = chl.name
		this.id = chl.id
		this.type = chl.type

		 if (!dm) {
			this.guild = new SocketGuild(chl.guild)
		 }
	}
}

async function get_rep_info(msg, socket) {
	msg.fetchReference().then(rep_msg => {
		socket.emit('REPLY_LOAD', new SocketMessage(msg, socket, {replyfunc: true}), new SocketMessage(rep_msg, socket))   
	})
}

class SocketMessage {
	constructor(msg, socket, options = {replyfunc: false}) {
		let msgArray = msg.content.split(" ")
		this.ids = []
		this.names = []
		this.true_content = msg.content

		msgArray.forEach(word => {
				let replace = /\d/g;
				if (word.match(replace) != null) {
					let id  = String((word.match(replace).join("")))
					// new_client.guilds.fetch(msg.guild.id).then(async guild => {
					// 	var member = await guild.members.fetch(id)
					// 	if (member) {
					// 		this.ids.push(id)
					// 		var the_name = {id: id, name: member.user.username, color: member.displayHexColor}
					// 		this.names.push(the_name)
					// 	}
					// })
					// try {
					// 	new_client.channels.fetch(id).then(channel => {
					// 		if (channel) {
					// 			this.ids.push(id)
					// 			var the_name = {id: id, name: channel.name, color: "#ffffff"}
					// 			this.names.push(the_name)	
					// 		}
					// 	})
					// } catch (err) {
					// 	print("what")
					// }
				}
		})

		this.content = toHTML(this.true_content)
		this.raw_content = msg.content

		const searchRegExp = /\n/gi
		this.edit_content = msg.content.replace(searchRegExp, "<br>")

		this.blocked = (BlockedUsers.includes(msg.author.id) ? true : false)

		if (msg.member != null) {
			this.member = {
				nickname: msg.member.nickname
			}
			this.color = msg.member.displayHexColor
		} else {
			this.member = {blank:true}
			this.color = '#fff'
		}
		
		this.editTimestamp = msg.editedTimestamp
		this.edited = (!(msg.editedTimestamp == 0 || msg.editedTimestamp == null))

		this.id = msg.id

		// var today = (moment.tz(Date.now(), 'America/New_York').format('M/D/YYYY')).split("/")
		// today = {month}
		this.timestamp = {real: moment.tz(msg.createdAt, 'America/New_York').calendar(), sort: msg.createdAt.valueOf()}

		var msg_id = this.id

		var gifs = msg.embeds.filter(emb => emb.type == "gifv")
		this.gifs = gifs.map(gif => {
			if (gif.video) {
				return gif.video.url
			} else {
				return gif.url
			}
		})

		function make_ath(ath) {
			var	mime_type = mime.lookup(ath.url)
			if (mime_type == false) {
				return null
			} else {
				return {
					id: ath.id, 
					name: ath.name, 
					url: ath.url, 
					type: mime_type.split("/")[0], 
					protocol: mime_type,
					msg: { 
						id: msg_id
					}
				}
			}
		}
		
		var accepted_types = ["link", "rich", "video"]

		var real_embeds = msg.embeds.filter(emb => accepted_types.includes(emb.type))

		this.embeds = real_embeds.map(emb => {
			return {
				url: emb.url,
				hexColor: emb.hexColor,
				author: (emb.author != null ? {name: emb.author.name, url: emb.author.url} : null),
				title: emb.title,
				desc: emb.description,
				footer: (emb.footer != null ? {text: emb.footer.text, icon: emb.footer.iconURL} : null),
				provider: (emb.provider != null ? {name: emb.provider.name, url: emb.provider.url} : null)
			}
		})

		this.attachments = msg.attachments.map(make_ath)
		
		var bits = msg.content.split(' ')
		var bit_count = 0
		bits.forEach(i => {
			if ((i.startsWith('https://cdn.discordapp.net/') || i.startsWith('https://media.discordapp.net/')) && i.endsWith('.gif')) {
				var	mime_type = mime.lookup(i)
				this.attachments.push({
					id: msg.id + `gif${bit_count}`,
					name: i.split('/')[6],
					url: i,
					type: mime_type.split("/")[0],
					protocol: mime_type,
					msg: { id: msg.id }
				})
				bit_count++
			}
		})

		if (options.replyfunc == false && msg.mentions.repliedUser != null) {
			get_rep_info(msg, socket)
			this.reply = true
		} else {
			this.reply = false
		}

		this.mentions = {
			me: false
		}
		var member_ids = msg.mentions.members.map(member => member.id)
		var role_ids = msg.mentions.roles.map(role => role.id)
		var usernames = msg.mentions.members.map(member => member.user.username)
		var rolenames = msg.mentions.roles.map(role => role.name)
		var m_colors = msg.mentions.members.map(member => (member.displayHexColor || 'ffffff'))
		var r_colors = msg.mentions.roles.map(role => role.hexColor)
		this.mentions.me = ((member_ids.includes(BLUBOT_ID)) || (member_ids.includes(BLUAXOLOTL_ID)))
		member_ids.forEach((id, index) => {
			this.content = this.content.replaceAll(("@"+id), `<span style="border-radius: 5px; background: ${m_colors[index]}6c; color: ${m_colors[index]};">@${usernames[index]}</span>`)
		})
		role_ids.forEach((id, index) => {
			this.content = this.content.replaceAll(("&"+id), `<span style="border-radius: 5px; background: ${r_colors[index]}6c; color: ${r_colors[index]};">@${rolenames[index]}</span>`)
		})

		this.guild = {
			name: msg.guild.name,
			id: msg.guild.id
		}
		
		this.channel = {
			id: msg.channel.id,
			name: msg.channel.name
		}

		this.author = {
			username: msg.author.username,
			id: msg.author.id
		}
	}
}

// function channel_init(channel_id) {
	
// }

new_client.on('messageCreate', msg => {
	if (!BlockedChannels.includes(msg.channel.id)) {
		print(`{${CachedMessages.length}} [${msg.guild.name}:${msg.channel.name}] ${msg.author.username}: ${msg.content}`)
		CachedMessages.push(msg)
	}
})

client.on('ready', () => {
	print(`v12 initialized... (${client.user.username})`)
	function start_server() { // retry server initialization
		if (no_connections) {
			server.listen((port+offset), () => {
				console.log(`listening on *:${(port+offset)}`)
				// setTimeout(function () {
				// 	if (no_connections) {
				// 		offset++
				// 		server.close(start_server)
				// 	}
				// }, 1000)
			})	
		}
	}
	start_server()
})

import('lowdb').then(module => {
	var {LowSync, JSONFileSync} = module
	adapter = new JSONFileSync("./config.json")
	db = new LowSync(adapter)
	db_read()

	new_client.on('ready', () => {
		print(`v13 initialized...`)
		client.login(token)
	})
	new_client.login(token)
})

//// Server ////
app.use('/', express.static('website'))

app.get('/', (req, res) => {
  res.sendFile('/index.html', {root: path.join(__dirname, 'website')});
});