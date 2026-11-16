"use client"
// AgilityImage wraps next/image and is documented as client-only in the App Router.
import React from "react"
import { AgilityImage } from "@agility/nextjs"

export default function NextImage(props) {
	return <AgilityImage {...props} />
}
