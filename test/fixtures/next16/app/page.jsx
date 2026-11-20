import Fixture from "../Fixture"
// The server-only entry point must import cleanly in a server component.
import { getAgilityPageProps, getAgilityPaths } from "@agility/nextjs/node"

export const dynamic = "force-static"

export default function Page() {
	if (typeof getAgilityPageProps !== "function" || typeof getAgilityPaths !== "function") throw new Error("node exports missing")
	return <Fixture />
}
