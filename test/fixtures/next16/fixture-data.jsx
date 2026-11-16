// Shared by the App Router and Pages Router pages.
export const hero = { label: "Hero", url: "https://cdn.example.com/x/hero.jpg", target: null, filesize: 1, width: 1920, height: 1080 }
export const card = { label: "Card", url: "https://cdn.example.com/x/card.jpg", target: null, filesize: 1, width: 800, height: 600 }
export const page = {
	pageID: 1,
	name: "home",
	title: "Home",
	zones: { main: [{ module: "Text", item: { contentID: 7, fields: { text: "<p>Zone content</p>" } } }] },
	seo: { metaDescription: "", metaKeywords: "", metaHTML: "" },
}
