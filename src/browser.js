const getParameterByName = (name) => {
	name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    var results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

const handlePreview = () => {

	if (!process.browser) {
		//kickout if this is not being executed in the browser
		return false;
	}

	const agilityPreviewKey = getParameterByName(`agilitypreviewkey`)

	if (!agilityPreviewKey) {
		//kickout if we don't have a preview key
		return false;
	}

	//redirect this to our preview API route
	const previewAPIRoute = `/api/preview`;

	let previewAPIUrl= `${previewAPIRoute}?slug=${window.location.pathname}&agilitypreviewkey=${agilityPreviewKey}`;

	const dynamicPageContentID = parseInt( getParameterByName('ContentID') ?? getParameterByName('contentID'))

	if(dynamicPageContentID > 0) {
		previewAPIUrl += `&ContentID=${dynamicPageContentID}`;
	}

	console.log("Activating preview", previewAPIUrl)

	setTimeout(function() {
		//do the redirect
		window.location.href = previewAPIUrl;
	}, 2500)


	return true

}

export {
	handlePreview
}