import React from "react"
import { renderHTML } from "@agility/nextjs"

export default function Text({ module }) {
	return <div className="text" dangerouslySetInnerHTML={renderHTML(module.fields.text)} />
}
