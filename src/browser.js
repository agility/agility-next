const getParameterByName = (name) => {
  name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
  var regex = new RegExp("[\\?&]" + name + "=([^&#]*)");
  var results = regex.exec(location.search);
  return results === null
    ? ""
    : decodeURIComponent(results[1].replace(/\+/g, " "));
};

const handlePreview = (handlePreviewProps) => {
  let previewUrlToUse = `/api/preview`;

  if (handlePreviewProps && handlePreviewProps.previewHandlerUrl)
    previewUrlToUse = handlePreviewProps.previewHandlerUrl;

  if (!process.browser) {
    //kickout if this is not being executed in the browser
    return false;
  }

  const agilityPreviewKey = getParameterByName(`agilitypreviewkey`);

  if (!agilityPreviewKey) {
    //kickout if we don't have a preview key
    return false;
  }

  //redirect this to our preview API route
  const previewAPIRoute = previewUrlToUse;

  let previewAPIUrl = `${previewAPIRoute}?slug=${window.location.pathname}&agilitypreviewkey=${agilityPreviewKey}`;

  const dynamicPageContentID = parseInt(
    getParameterByName("ContentID") ?? getParameterByName("contentID")
  );

  if (dynamicPageContentID > 0) {
    previewAPIUrl += `&ContentID=${dynamicPageContentID}`;
  }

  if (console) console.log("Activating preview", previewAPIUrl);

  setTimeout(function () {
    //do the redirect
    window.location.href = previewAPIUrl;
  }, 2500);

  return true;
};

export { handlePreview };
