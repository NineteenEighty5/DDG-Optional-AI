// Firefox has a known problem with regexSubstitution redirects for main
// frame requests.
// Chrome uses regexSubstitution in rules.json. It works there.
// This code is a backup method for Firefox.
// It uses webNavigation and tabs.update.
// It sends the same three routes as rules.json.
//
// Chrome does not use this code.
// The variable "browser" is undefined in the Chrome service worker.
// The check below stops this code from running in Chrome.

const isFirefox = typeof browser !== "undefined";

if (isFirefox && browser.webNavigation && browser.tabs) {
  browser.webNavigation.onBeforeNavigate.addListener(
    (details) => {
      // This code acts only on the top frame.
      if (details.frameId !== 0) return;

      let url;
      try {
        url = new URL(details.url);
      } catch (e) {
        return;
      }

      if (url.hostname !== "duckduckgo.com") return;
      if (!url.searchParams.has("q")) return;

      // Do not process a URL two times.
      // This extension may create the Duck.ai URL.
      // If the listener runs again on that URL, it sees a plain query.
      // The plain query has no question mark.
      // The code would then send the user to the no-AI site by mistake.
      // The check below stops this error.
      if (url.searchParams.has("duckai")) return;

      const query = url.searchParams.get("q").trim();

      // The query ends with two question marks.
      // Remove the two question marks.
      // Send the user to the Duck.ai chat page.
      // The page needs two params to show the query as the prompt.
      // The param "q" holds the query text.
      // The param "prompt" must have the value "1".
      // Without "prompt=1", the page does not fill the prompt box.
      if (query.endsWith("??")) {
        const stripped = query.slice(0, -2).trimEnd();
        const target = new URL("https://duckduckgo.com/");
        target.searchParams.set("q", stripped);
        target.searchParams.set("ia", "chat");
        target.searchParams.set("duckai", "1");
        target.searchParams.set("prompt", "1");
        browser.tabs.update(details.tabId, { url: target.toString() });
        return;
      }

      // The query ends with one question mark.
      // Do not change the page.
      // The AI results stay on duckduckgo.com.
      if (query.endsWith("?")) return;

      // The query does not end with a question mark.
      // Send the user to the no-AI subdomain.
      const redirected = new URL(url.toString());
      redirected.hostname = "noai.duckduckgo.com";
      browser.tabs.update(details.tabId, { url: redirected.toString() });
    },
    { url: [{ hostEquals: "duckduckgo.com" }] }
  );
}
