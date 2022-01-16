const print = console.log

class TextParser {
	constructor (text) {
		this.text = text
	}
	replaceSurr (old_text, surr, new_text) {
		let replace = `${surr}${old_text}${surr}`
		let regex = new RegExp(replace, "g")
		return this.text.replace(regex, new_text)
	}

	replaceSurrDict (surr, dict) {
		let new_text = this.text
		for (const [k, v] of Object.entries(dict)) {
			let replace = `${surr}${k}${surr}`
			if (new_text.includes(replace)) {
				let regex = new RegExp(replace, "g")
				new_text = new_text.replace(regex, v)
			}
		}
		return new_text
	}
}

module.exports = {
	parser: TextParser
}