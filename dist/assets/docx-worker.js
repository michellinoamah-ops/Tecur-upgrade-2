importScripts("/assets/vendor/mammoth.browser.js");
onmessage = async (e) => {
  try {
    const result = await mammoth.convertToHtml(
      { arrayBuffer: e.data },
      { externalFileAccess: false },
    );
    postMessage({ html: result.value });
  } catch {
    postMessage({
      error: "Word document could not be imported. Save it as a standard .docx and try again.",
    });
  }
};
