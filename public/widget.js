(function () {
  const container = document.currentScript.parentElement;
  const iframe = document.createElement("iframe");

  iframe.src = "https://tima-chatbot.vercel.app/";
  iframe.style.width = "100%";
  iframe.style.height = "640px";
  iframe.style.border = "none";
  
   container.appendChild(iframe);
  // document.body.appendChild(iframe);
})();




