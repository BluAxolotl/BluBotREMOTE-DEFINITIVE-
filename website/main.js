var messages_element = document.getElementById('messages')
var channels_element = document.getElementById('channels')
var guilds_element = document.getElementById('servers')
var image_element = document.getElementById('image-button')
var channel_elements = []

var pending_reply = false
var pending_edit = false
var shift_down = false

var page_loaded = false
var last_value = ""

var load_msg = null
var load_more_button = null

var CachedMessages = {}
var LoadingAttachments = new Map

//// TESTING ////

socket.on('test', data => {

	var p = document.createElement('p')
	p.textContent = String(data)
	messages_element.appendChild(p)
})

//// Classes ////

class GuildElement {
	constructor(gld) {
		var base = document.createElement('div')
		var text = document.createElement('p')
		base.classList.add('guild')
		text.textContent = gld.nameAcronym
		var default_channel = gld.channels[0].id
		var temp = window.sessionStorage.getItem(gld.id)
		if (temp) {default_channel = window.sessionStorage.getItem(gld.id)}
		base.onclick = function(e) {
			socket.emit('REQUEST_CHANNEL', default_channel)
		}
		base.appendChild(text)
		guilds_element.appendChild(base)
	}
}

class ChannelElement {
	constructor(chl) {
		var p = document.createElement('p')
		// p.setAttribute('msg_obj', encodeURI(JSON.stringify(msg)))
		p.innerHTML = `${chl.name}`
		p.id = chl.id
		p.setAttribute('obj', JSON.stringify(chl))
		p.onclick = function(e) {
			socket.emit('REQUEST_CHANNEL', chl.id)
		}
		channel_elements.push(p)
		channels_element.appendChild(p)
		chl.threads.forEach(thd => {
			var thd_p = document.createElement('p')
			thd_p.innerHTML = `<span style="color:#0000007c;">--</span> ${thd.name}`
			thd_p.id = thd.id
			thd_p.onclick = function(e) {
				socket.emit('REQUEST_CHANNEL', thd.id)
			}
			thd_p.setAttribute('obj', JSON.stringify(thd))
			channel_elements.push(thd_p)
			if (p.nextSibling != null) { channels_element.insertBefore(thd_p, p.nextSibling) } else {channels_element.appendChild(thd_p)}
		})
	}
}

class MessageElement {
	constructor(msg, append, live, options = {reply: false, delete: false}) {
		// LOCAL VARIABLE DECLARATIONS
		var this_client = (msg.author.id == BLUBOT_ID)

		// MAIN ELEMENT
		var p = document.createElement('p')
		p.setAttribute('msg_obj', encodeURI(JSON.stringify(msg)))
		p.setAttribute('deleted', "false")
		let author = (msg.member.nickname ? `${msg.member.nickname} <span style="color: #7c7c7c;">(${msg.author.username})</span>` : msg.author.username)
		let alt_author
		if (options.reply != false) { alt_author = (options.reply.member.nickname ? `${options.reply.member.nickname} <span style="color: #7c7c7c;">(${options.reply.author.username})</span>` : options.reply.author.username) }
		let edit_status = (msg.edited ? `<span style="color: #7c7c7c; font-style: italic;">(edited)</span>` : "")
		let reply_status = (options.reply != false ? `<span class="reply-line"><span style="color:${options.reply.color}">${alt_author}</span>: ${options.reply.content} ⤵</span><br>` : "")
		
		let i = 0
		msg.ids.forEach(id => {
			msg.content = msg.content.replace(`@${id}`,`<span style="color: ${msg.names[i].color}; background-color: ${msg.names[i].color}4c">@${msg.names[i].name}</span>`)
			msg.content = msg.content.replace(`#${id}`,`<span style="color: ${msg.names[i].color}; background-color: ${msg.names[i].color}4c">#${msg.names[i].name}</span>`)
			i = i+1
		})

		p.innerHTML = `${reply_status}<span style="color: #7c7c7c;">[${msg.timestamp.real}] </span><span style="color: ${msg.color};">${author}</span>:<br>${msg.content} ${edit_status}`
		p.classList.add('messagetext')
		p.id = msg.id

		// ATTACHMENT BUTTON
		if (msg.attachments.length > 0) {
			msg.attachments.forEach(ath => {
				var open_attachment_button = document.createElement('button')
				open_attachment_button.id = ath.id
				open_attachment_button.textContent = ath.name
				open_attachment_button.onclick = function (e) {
					socket.emit("REQUEST_ATTATCHMENT", ath)
				}
				p.append(document.createElement('br'))
				p.appendChild(open_attachment_button)
			})
		}
		// EMBEDS
		msg.raw_content.split(' ').forEach(i => {
			// YOUTUBE
			if (i.startsWith("https://www.youtube.com/watch?v=") || i.startsWith("https://youtu.be/")) {
				var youtube_element = document.createElement('iframe')
				var video_id = i.replace("https://www.youtube.com/watch?v=", "")
				video_id = video_id.replace("https://youtu.be/", "")
				video_id = video_id.split("&")[0]
				video_id = video_id.replace("?t=", "?start=")
				youtube_element.src = `https://www.youtube.com/embed/${video_id}`
				print(youtube_element.src)
				youtube_element.classList.add('ath')
				p.append(document.createElement('br'))
				p.appendChild(youtube_element)
			}
			if (msg.gifs) {
				msg.gifs.forEach(i => {
					var gif_element = document.createElement('video')
					gif_element.src = i
					gif_element.controls = false
					gif_element.loop = true
					print(i)
					gif_element.classList.add('ath')
					gif_element.setAttribute('blur', 'true')
					gif_element.setAttribute('style', 'filter: blur(10px);')
					gif_element.pause()
					gif_element.onclick = function(e) {
						var blur = gif_element.getAttribute('blur')
						if (blur == 'false') {
							gif_element.currentTime = 0
							gif_element.setAttribute('blur', 'true')
							gif_element.setAttribute('style', 'filter: blur(20px);')
							gif_element.pause()
						} else {
							gif_element.setAttribute('blur', 'false')
							gif_element.removeAttribute('style')
							gif_element.play()
						}
					}
					p.append(document.createElement('br'))
					p.appendChild(gif_element)
				})
			}
		})
		// msg.embeds.forEach(i => {
		// 	print(JSON.stringify(i))
		// 	if (i.type == "gifv") {
		// 		i.forEach(o => {
		// 			var gif_element = document.createElement('img')
		// 			gif_element.src = o.url
		// 			p.appendChild(gif_element)
		// 		})
		// 	}
		// })
		// CREATING BUTTON ELEMENTS
		var info_button = document.createElement('button')
		var reply_button = document.createElement('button')
		var edit_button = document.createElement('button')
		var delete_button = document.createElement('button')
		var image_element = document.getElementById('image-button')
		// INFO BUTTON
		info_button.textContent = "🔍"
		info_button.onclick = function (e) {
			if (shift_down) {
				socket.emit('MSG_INFO', current_channel, msg.id)
			} else {
				print(`== MSG INFO ==\n${JSON.stringify(msg)}\n`)
			}
		}
		// REPLY BUTTON
		reply_button.textContent = "️️↩️"
		reply_button.onclick = function (e) {
			pending_edit = false
			pending_reply = msg.id
			image_element.textContent = "REPLY"
			print(`\nREPLY ==> (${pending_reply})\n`)
		}
		// EDIT BUTTON
		edit_button.textContent = "️️✏️"
		edit_button.onclick = pend_edit.bind(null, msg)
		// DELETE ELEMENT
		delete_button.textContent = "️️❌"
		delete_button.onclick = function (e) {
			socket.emit("DELETE", current_channel, msg.id)
			print(`\nDELETE ==> (${msg.id})\n`)
		}
		// ITERATING THROUGH BUTTONS
		var buttons = [reply_button, edit_button, delete_button, info_button]
		var hovered = false
		buttons.forEach(curr_button => { curr_button.classList.add('messagebutton') })
		window.addEventListener('keydown', function (e) {
			var hovered = false
			if (p.hasAttribute("hovered")) { hovered = Boolean(p.getAttribute("hovered")) }
			if (hovered && e.which == 16) {
				p.style = "background: #000000;"
				buttons.forEach(curr_button => { curr_button.setAttribute('style', 'opacity: 1; display: inline;') })
			}
		})
		window.addEventListener('keyup', function (e) {
			if (e.which == 16) {
				p.style = ""
				buttons.forEach(curr_button => { curr_button.setAttribute('style', 'opacity: 0; display: none;') })
			}
		})
		p.addEventListener('mouseenter', function (e) {
			p.setAttribute('hovered', "true")
		})
		p.addEventListener('mouseleave', function (e) {
			p.setAttribute('hovered', "")
			p.style = ""
			buttons.forEach(curr_button => { curr_button.setAttribute('style', 'opacity: 0; display: none;') })
		})
		// APPEND BUTTONS
		p.appendChild(info_button)
		p.appendChild(reply_button)
		if (this_client) { p.appendChild(edit_button) }
		p.appendChild(delete_button)

		// APPEND MESSAGE ELEMENT + SCROLLING
		if (!msg.blocked && append) { messages_element.appendChild(p); twemoji.parse(messages_element) } else { this.p = p }
		if (live) {
			var a = messages_element.scrollTop;
			var b = messages_element.scrollHeight - messages_element.clientHeight;
			var c = (a / b)*100;
			if (this_client || (c) > 98) {
				messages_element.scrollTo(0, messages_element.scrollHeight)
			}
		}

	}
}

//// Functions ////

function setCaretPosition(ctrl, pos) {
  // Modern browsers
  if (ctrl.setSelectionRange) {
		print("NEW")
    ctrl.focus();
    ctrl.setSelectionRange(pos, pos);
  
  // IE8 and below
  } else if (ctrl.createTextRange) {
		print("OLD")
    var range = ctrl.createTextRange();
    range.collapse(true);
    range.moveEnd('character', pos);
    range.moveStart('character', pos);
    range.select();
  }
}

function insert_text(txt1, txt2, index) { return txt1.slice(0, index) + txt2 + txt1.slice(index) }

function load_button(msg, replace) {
	load_msg = msg
	load_more_button = document.createElement('button')
	load_more_button.id = "load-more"
	load_more_button.textContent = "Load More..."
	load_more_button.onclick = function (e) {
		socket.emit("REQUEST_MESSAGES", msg)
		load_more_button.remove()
	}
	if (replace) { messages_element.insertBefore(load_more_button, messages_element.firstChild) } else { messages_element.appendChild(load_more_button) }
}

function message_delete(msg) {
	var m = document.getElementById(msg.id)
	m.innerHTML = m.innerHTML + `<span style="color: #e03c28; font-style: italic;">(deleted)</span>`
	m.setAttribute('deleted', 'true')
}

function message_edit(oldMsg, msg) {
	let current = messages_element.scrollTop
	var m = document.getElementById(oldMsg.id)
	messages_element.replaceChild(new MessageElement(msg, false, true).p, m)
	messages_element.scrollTop = current
}

function pend_edit(msg) {
	var input = document.getElementById('chatfield-input')
	var image_element = document.getElementById('image-button')
	input.value = msg.edit_content
	setTimeout(setCaretPosition.bind(null, input, input.value.length), 100)
	pending_reply = false
	pending_edit = msg.id
	if (input.value) {
		try { image_element.textContent = "EDIT" } catch(err) { print(err) }
		print(`\nEDIT ==> (${pending_edit})\n`)
	} else {
		print(`\nDELETE ==> (${pending_edit})\n`)
	}
}

function simulateKeyPress(code) {
  jQuery.event.trigger({
    type: 'keypress',
    which: code
  });
}

//// Socket Events ////

socket.on('PRINT_UH', () => {
	var a = messages_element.scrollTop;
	var b = messages_element.scrollHeight - messages_element.clientHeight;
	var c = (a / b)*100;
	print(c)
})

socket.on('OPEN_ATTACHMENT', (ath, data, count) => {
	var type = (ath.type == "image" ? "img" : ath.type)
	switch (data) {
		case "init":
			var ath_element = document.createElement(`${type}`)
			var oa_button = document.getElementById(ath.id)
			ath_element.classList.add('ath')
			oa_button.parentNode.replaceChild(ath_element, oa_button)
			LoadingAttachments.set(ath.id, [])
			ath_element.id = `attach-${ath.id}`
			if (ath.type = ("audio" || "video")) { ath_element.controls = true }
		break;
		case 'finished':
			var ath_element = document.getElementById(`attach-${ath.id}`)
			var current_data = LoadingAttachments.get(ath.id)
			var blob = new Blob((current_data), {type : ath.protocol})
			LoadingAttachments.delete(ath.id)
			var blob_url = URL.createObjectURL(blob)
			ath_element.src = blob_url
			print(`\nDONE ==> '${ath.name}'\n`)
		break;
		default:
			var temp = LoadingAttachments.get(ath.id)
			temp.push(new Uint8Array(data).buffer)
			LoadingAttachments.set(ath.id, temp)
	}
})

socket.on('REPLY_LOAD', (own_msg, msg) => {
	let current = messages_element.scrollTop
	var msg_elem = document.getElementById(own_msg.id)
	messages_element.replaceChild(new MessageElement(own_msg, false, true, {reply: msg}).p, msg_elem)
	messages_element.scrollTop = current
})

socket.on('NEW_MESSAGE', (msg) => {
	if (msg.channel.id == current_channel) { new MessageElement(msg, true, true) }
})

socket.on('DELETE_MESSAGE', (msg) => {
	if (msg.channel.id == current_channel) { message_delete(msg) }
})

socket.on('EDIT_MESSAGE', (oldMsg, msg) => {
	if (msg.channel.id == current_channel) { message_edit(oldMsg, msg) }
})

socket.on('PUSH_MESSAGES', (msgs) => {
	var a = messages_element.scrollHeight - messages_element.clientHeight;
	var top = a
	msgs.forEach(msg => {
		var p = new MessageElement(msg, false, false).p
		messages_element.insertBefore(p, messages_element.firstChild)
	})
	load_button(msgs[msgs.length-1], true)
	print("\n== MESSAGES LOADED ==\n")
	var b = messages_element.scrollHeight - messages_element.clientHeight;
	messages_element.scrollTo(0, b-a)
})

socket.on('CHANNEL_INIT', (guilds, channel, msgs) => {
	try {
		current_channel = channel.id
		
		window.sessionStorage.setItem(channel.guild.id, channel.id)

		if (current_guild != channel.guild.id) {
			channel_elements = []
			channels_element.replaceChildren()
			current_guild = channel.guild.id
			channel.guild.channels.forEach(chl => {
				new ChannelElement(chl)
			})
		}

		messages_element.replaceChildren()

		load_button(msgs[0], false)

		msgs.forEach(msg => {
			new MessageElement(msg, true, false)
		})

		guilds_element.replaceChildren()

		guilds.forEach(gld => {
			new GuildElement(gld)
		})

		page_loaded = true

		channel_elements.forEach(i => {
			var chl = JSON.parse(i.getAttribute('obj'))
			if (chl.id == current_channel) {
				i.setAttribute('style', "color: #fff")
			} else {
				i.setAttribute('style', "color: #7c7c7c")
			}
		})
		
		messages_element.scrollTo(0, messages_element.scrollHeight)
	} catch (err) {
		print(err)
	}
})

socket.emit('REQUEST_CHANNEL', current_channel)

//// Document Events ////

window.addEventListener('keyup', (e) => { // SENDING A MESSAGE
	switch (event.which) {
		case 16:
			shift_down = false
		break;
	}
})

document.onpaste = function(pasteEvent) {
	var input = document.getElementById('chatfield-input')
	var temp_content = (input.value != null ? input.value : "")
	// consider the first item (can be easily extended for multiple items)
	var item_count = pasteEvent.clipboardData.items.length
	for (var i=0; i < item_count; i++) {
		var item = pasteEvent.clipboardData.items[i]
		if (item.type.indexOf("image") === 0)	{
				var blob = item.getAsFile();

				var reader = new FileReader();
				reader.onload = function(event) {
						print("sending to backend...")
						socket.emit("UPLOAD", current_channel, event.target.result, temp_content)
						if (input.value) {input.value = ""}
						return
				};

				reader.readAsDataURL(blob)
		}
	}
}

function parse_input(msg_input) {
	return new TextParser(msg_input).replaceSurrDict(":", emotes)
}

messages_element.addEventListener('scroll', function(e) {
	var a = messages_element.scrollTop;
	var b = messages_element.scrollHeight - messages_element.clientHeight;
	var c = (a / b)*100;
	if (c == 0) {
		socket.emit("REQUEST_MESSAGES", load_msg)
		load_more_button.remove()
	}
})


function sending_func(...args) {
	try {
		var input = document.getElementById('chatfield-input')
		var image_element = document.getElementById('image-button')
		if (pending_reply == false && pending_edit == false) { // CREATE MESSAGE
			if (input.value) { socket.emit("SEND_MESSAGE", current_channel, parse_input(input.value)) }
		} else if (pending_edit == false) { // REPLY MESSAGE
			if (input.value) {
				socket.emit("REPLY", current_channel, pending_reply, parse_input(input.value))
				pending_reply = false
			}
		} else if (pending_reply == false) { // EDITING OR DELETE
			if (input.value == "") { // DELETE
				socket.emit("DELETE", current_channel, pending_edit)
			} else { // EDIT
				socket.emit("EDIT", current_channel, pending_edit, parse_input(input.value))
			}
			pending_edit = false
		}
		input.value = '';
		image_element.textContent = "SEND"
	} catch(err) {
		print(err)
	}
}

function emote_menu(value) {
	try {
		var words = value.split(' ')
		if (words.length > 0) {
			word = words[words.length-1]
			if (word.length > 1 && word.startsWith(":") && word.endsWith(":")) {
				let regex = new RegExp(":", "g")
				var emote_name = word.replace(regex, "")
				if (emotes[emote_name] != null) {
					print(`\n== ${emotes[emote_name]} ==\n`)
				} else {
					print("\n== Invalid Emote Name ==\n")
				}
			}
		}
	} catch(err) {
		print(err)
	}
}

window.addEventListener('keydown', async (e) => { // SENDING A MESSAGE
var input = document.getElementById('chatfield-input')
setTimeout(function(){
	if (input.value != last_value) { emote_menu(input.value) }
}, 10)
last_value = input.value
var image_element = document.getElementById('image-button')
switch (event.which) {
	case 16:
		shift_down = true
	break;
	// case 45:
	// 	var	can_clip = await navigator.permissions.query({ name: "clipboard-read" })
	// 	print(can_clip)
	// 	var clipdata = await navigator.clipboard.read()
	// 	var cliptypes = clipdata.types
	// 	print(cliptypes)
	// break;
	case 27:
	if (pending_edit) { print("CANCEL ==> EDIT") }
	if (pending_reply) { print("CANCEL ==> REPLY") }
	image_element.textContent = "SEND"
		pending_edit = false
		pending_reply = false
	break;
	case 13:
		if (shift_down) { // NEWLINE
			var caret_pos = e.target.selectionStart
			input.value = insert_text(input.value, "<br>", caret_pos)
			setCaretPosition(input, caret_pos+4)
		} else { // MESSAGE MANIPULATION
			sending_func()
		}
	break;
	case 38:
		var messages = messages_element.children
		for (var o = messages.length-1; o > -1; o--) {
			var i = messages[o]
			var msg = i.getAttribute("msg_obj")
			msg = JSON.parse(decodeURI(msg))
			if (msg.author.id == '705347670054666260' && i.getAttribute("deleted") == "false") {
				pend_edit(msg)
				o = -1
			}
		}
	break;
}
})

document.getElementById('image-button').onclick = sending_func