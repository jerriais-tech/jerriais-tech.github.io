import React from "react";
import Layout from "../layouts/Layout";
import ProjectCard from "../layouts/ProjectCard";
import CommunityLink from "../layouts/CommunityLink";

const contactFormScript = `
const form = document.getElementById("form");
const button = form.querySelector("button");
const fieldset = form.querySelector("fieldset");
const formError = document.getElementById("form-error");

function success() {
  form.innerHTML = '<div class="text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">Form submitted. We\\'ll get back to you as soon as we can.</div>';
}

function failure() {
  button.innerText = "Submit";
  fieldset.disabled = false;
  formError.style.display = "block";
}

async function submitForm(event) {
  event.preventDefault();
  button.innerText = "Submitting...";
  fieldset.disabled = false;
  formError.style.display = "none";
  const formData = Object.fromEntries(new FormData(event.target).entries());
  fieldset.disabled = true;
  try {
    const response = await fetch(
      "https://www.form-to-email.com/api/s/57zwbiuy5Jli",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      }
    );
    if (response.ok) { success(); } else { failure(); }
  } catch (e) {
    failure();
  }
}

form.addEventListener('submit', submitForm);
`;

export default function render(_data: unknown) {
  return (
    <Layout title="Jèrriais.Tech" showMenu={false}>
      {/* Hero */}
      <div className="px-4 py-20 text-center">
        <h1 className="text-5xl font-bold mb-4">Jèrriais.Tech</h1>
        <div className="max-w-xl mx-auto">
          <p className="text-xl text-gray-600">
            We are an organisation using technology to promote Jèrriais, the
            native language of the island of Jersey.
          </p>
        </div>
      </div>

      {/* Projects */}
      <div className="max-w-screen-xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold pb-2 mb-8 border-b border-gray-200">
          Projects
        </h2>
        <div className="grid grid-cols-2 gap-10 lg:grid-cols-4">
          <ProjectCard
            href="https://huggingface.co/spaces/jerriais-tech/jerriais-tts"
            ctaText="Hear Jèrriais"
            title="Jèrriais Text-To-Speech"
            description={
              <>
                Enter Jèrriais text and hear how it is pronounced. Trained on
                pronunciation examples recorded by Geraint Jennings. Click
                "Restart space" if the app has gone to sleep.
              </>
            }
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                viewBox="0 0 16 16"
              >
                <path d="M11.536 14.01A8.47 8.47 0 0 0 14.026 8a8.47 8.47 0 0 0-2.49-6.01l-.708.707A7.48 7.48 0 0 1 13.025 8c0 2.071-.84 3.946-2.197 5.303z" />
                <path d="M10.121 12.596A6.48 6.48 0 0 0 12.025 8a6.48 6.48 0 0 0-1.904-4.596l-.707.707A5.48 5.48 0 0 1 11.025 8a5.48 5.48 0 0 1-1.61 3.89z" />
                <path d="M10.025 8a4.5 4.5 0 0 1-1.318 3.182L8 10.475A3.5 3.5 0 0 0 9.025 8c0-.966-.392-1.841-1.025-2.475l.707-.707A4.5 4.5 0 0 1 10.025 8M7 4a.5.5 0 0 0-.812-.39L3.825 5.5H1.5A.5.5 0 0 0 1 6v4a.5.5 0 0 0 .5.5h2.325l2.363 1.89A.5.5 0 0 0 7 12zM4.312 6.39 6 5.04v5.92L4.312 9.61A.5.5 0 0 0 4 9.5H2v-3h2a.5.5 0 0 0 .312-.11" />
              </svg>
            }
          />
          <ProjectCard
            href="https://dictionary.jerriais.tech/"
            ctaText="Browse the dictionary"
            title="Jèrriais dictionary"
            description={
              <>
                A digital version of the English/Jèrriais and Jèrriais/English
                dictionaries. Copyright for the dictionary data is held by
                Société Jèrsiaise, Jersey Heritage and Le Don Balleine.
              </>
            }
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="1em"
                height="1em"
                fill="currentColor"
                viewBox="0 0 16 16"
              >
                <path d="M8.5 2.687c.654-.689 1.782-.886 3.112-.752 1.234.124 2.503.523 3.388.893v9.923c-.918-.35-2.107-.692-3.287-.81-1.094-.111-2.278-.039-3.213.492zM8 1.783C7.015.936 5.587.81 4.287.94c-1.514.153-3.042.672-3.994 1.105A.5.5 0 0 0 0 2.5v11a.5.5 0 0 0 .707.455c.882-.4 2.303-.881 3.68-1.02 1.409-.142 2.59.087 3.223.877a.5.5 0 0 0 .78 0c.633-.79 1.814-1.019 3.222-.877 1.378.139 2.8.62 3.681 1.02A.5.5 0 0 0 16 13.5v-11a.5.5 0 0 0-.293-.455c-.952-.433-2.48-.952-3.994-1.105C10.413.809 8.985.936 8 1.783" />
              </svg>
            }
          />
          <ProjectCard
            href="https://www.keyman.com/keyboards/jerriais"
            ctaText="Install the keyboard"
            title="Jèrriais keyboard"
            description={
              <>
                A smartphone keyboard for typing in Jèrriais. Features spelling
                suggestions courtesy of Geraint Jennings' spell checker file.
                See the{" "}
                <a
                  href="https://www.youtube.com/playlist?list=PLRIRN_uyXJe0fQuuqXQmtjRdWqlVKyvwG"
                  className="underline text-blue-600"
                >
                  video tutorials
                </a>{" "}
                for help installing and using the keyboard.
              </>
            }
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="1em"
                height="1em"
                fill="currentColor"
                viewBox="0 0 16 16"
              >
                <path d="M14 5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM2 4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
                <path d="M13 10.25a.25.25 0 0 1 .25-.25h.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-.5a.25.25 0 0 1-.25-.25zm0-2a.25.25 0 0 1 .25-.25h.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-.5a.25.25 0 0 1-.25-.25zm-5 0A.25.25 0 0 1 8.25 8h.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-.5A.25.25 0 0 1 8 8.75zm2 0a.25.25 0 0 1 .25-.25h1.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-1.5a.25.25 0 0 1-.25-.25zm1 2a.25.25 0 0 1 .25-.25h.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-.5a.25.25 0 0 1-.25-.25zm-5-2A.25.25 0 0 1 6.25 8h.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-.5A.25.25 0 0 1 6 8.75zm-2 0A.25.25 0 0 1 4.25 8h.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-.5A.25.25 0 0 1 4 8.75zm-2 0A.25.25 0 0 1 2.25 8h.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-.5A.25.25 0 0 1 2 8.75zm11-2a.25.25 0 0 1 .25-.25h.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-.5a.25.25 0 0 1-.25-.25zm-2 0a.25.25 0 0 1 .25-.25h.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-.5a.25.25 0 0 1-.25-.25zm-2 0A.25.25 0 0 1 9.25 6h.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-.5A.25.25 0 0 1 9 6.75zm-2 0A.25.25 0 0 1 7.25 6h.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-.5A.25.25 0 0 1 7 6.75zm-2 0A.25.25 0 0 1 5.25 6h.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-.5A.25.25 0 0 1 5 6.75zm-3 0A.25.25 0 0 1 2.25 6h1.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-1.5A.25.25 0 0 1 2 6.75zm0 4a.25.25 0 0 1 .25-.25h.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-.5a.25.25 0 0 1-.25-.25zm2 0a.25.25 0 0 1 .25-.25h5.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-5.5a.25.25 0 0 1-.25-.25z" />
              </svg>
            }
          />
          <ProjectCard
            href="./jerridle"
            ctaText="Play Jèrridle"
            title="Jèrridle"
            description="A Jèrriais word game. You have 6 chances to guess the 5-letter
              Jèrriais word, with colourful clues to let you know which letters
              are correct. It's Wordle for Jèrriais!"
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="1em"
                height="1em"
                fill="currentColor"
                viewBox="0 0 16 16"
              >
                <path d="M11.5 6.027a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0m-1.5 1.5a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1m2.5-.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0m-1.5 1.5a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1m-6.5-3h1v1h1v1h-1v1h-1v-1h-1v-1h1z" />
                <path d="M3.051 3.26a.5.5 0 0 1 .354-.613l1.932-.518a.5.5 0 0 1 .62.39c.655-.079 1.35-.117 2.043-.117.72 0 1.443.041 2.12.126a.5.5 0 0 1 .622-.399l1.932.518a.5.5 0 0 1 .306.729q.211.136.373.297c.408.408.78 1.05 1.095 1.772.32.733.599 1.591.805 2.466s.34 1.78.364 2.606c.024.816-.059 1.602-.328 2.21a1.42 1.42 0 0 1-1.445.83c-.636-.067-1.115-.394-1.513-.773-.245-.232-.496-.526-.739-.808-.126-.148-.25-.292-.368-.423-.728-.804-1.597-1.527-3.224-1.527s-2.496.723-3.224 1.527c-.119.131-.242.275-.368.423-.243.282-.494.575-.739.808-.398.38-.877.706-1.513.773a1.42 1.42 0 0 1-1.445-.83c-.27-.608-.352-1.395-.329-2.21.024-.826.16-1.73.365-2.606.206-.875.486-1.733.805-2.466.315-.722.687-1.364 1.094-1.772a2.3 2.3 0 0 1 .433-.335l-.028-.079zm2.036.412c-.877.185-1.469.443-1.733.708-.276.276-.587.783-.885 1.465a14 14 0 0 0-.748 2.295 12.4 12.4 0 0 0-.339 2.406c-.022.755.062 1.368.243 1.776a.42.42 0 0 0 .426.24c.327-.034.61-.199.929-.502.212-.202.4-.423.615-.674.133-.156.276-.323.44-.504C4.861 9.969 5.978 9.027 8 9.027s3.139.942 3.965 1.855c.164.181.307.348.44.504.214.251.403.472.615.674.318.303.601.468.929.503a.42.42 0 0 0 .426-.241c.18-.408.265-1.02.243-1.776a12.4 12.4 0 0 0-.339-2.406 14 14 0 0 0-.748-2.295c-.298-.682-.61-1.19-.885-1.465-.264-.265-.856-.523-1.733-.708-.85-.179-1.877-.27-2.913-.27s-2.063.091-2.913.27" />
              </svg>
            }
          />
        </div>
      </div>

      {/* Community */}
      <div className="max-w-screen-xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold pb-2 mb-8 border-b border-gray-200">
          Community
        </h2>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
          <CommunityLink
            href="https://discord.gg/PUGK8bZ5v7"
            linkText="Join us on Discord"
            title="Discord server"
            description={
              <>
                Chat in Jèrriais or about Jèrriais on our{" "}
                <strong>La Caqu'téthie</strong> server.
              </>
            }
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="1.75em"
                height="1.75em"
                fill="currentColor"
                viewBox="0 0 16 16"
              >
                <path d="M13.545 2.907a13.2 13.2 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.2 12.2 0 0 0-3.658 0 8 8 0 0 0-.412-.833.05.05 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.04.04 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032q.003.022.021.037a13.3 13.3 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019q.463-.63.818-1.329a.05.05 0 0 0-.01-.059l-.018-.011a9 9 0 0 1-1.248-.595.05.05 0 0 1-.02-.066l.015-.019q.127-.095.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.05.05 0 0 1 .053.007q.121.1.248.195a.05.05 0 0 1-.004.085 8 8 0 0 1-1.249.594.05.05 0 0 0-.03.03.05.05 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.2 13.2 0 0 0 4.001-2.02.05.05 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.03.03 0 0 0-.02-.019m-8.198 7.307c-.789 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612m5.316 0c-.788 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612" />
              </svg>
            }
          />
          <CommunityLink
            href="https://www.facebook.com/groups/jerriais"
            linkText="Join us on Facebook"
            title="Facebook group"
            description={
              <>
                Keep up to date with Jèrriais on the{" "}
                <strong>Jèrriais Speakers and Learners</strong> Facebook group.
              </>
            }
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="1.75em"
                height="1.75em"
                fill="currentColor"
                viewBox="0 0 16 16"
              >
                <path d="M16 8.049c0-4.446-3.582-8.05-8-8.05C3.58 0-.002 3.603-.002 8.05c0 4.017 2.926 7.347 6.75 7.951v-5.625h-2.03V8.05H6.75V6.275c0-2.017 1.195-3.131 3.022-3.131.876 0 1.791.157 1.791.157v1.98h-1.009c-.993 0-1.303.621-1.303 1.258v1.51h2.218l-.354 2.326H9.25V16c3.824-.604 6.75-3.934 6.75-7.951" />
              </svg>
            }
          />
        </div>
      </div>

      {/* Contact */}
      <div className="max-w-screen-xl mx-auto px-4 py-16" id="contact">
        <h2 className="text-2xl font-bold pb-2 mb-8 border-b border-gray-200">
          Contact
        </h2>
        <p className="mb-6 text-gray-600">Contact us using the form below.</p>
        <div className="max-w-2xl">
          <form id="form">
            <fieldset>
              <div className="mb-4">
                <label
                  htmlFor="form-name"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  id="form-name"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="mb-4">
                <label
                  htmlFor="form-email"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Email address
                </label>
                <input
                  type="email"
                  name="email"
                  id="form-email"
                  required
                  aria-describedby="emailHelp"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p id="emailHelp" className="text-xs text-gray-500 mt-1">
                  We'll never share your email with anyone else.
                </p>
              </div>
              <div className="mb-6">
                <label
                  htmlFor="form-message"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Message
                </label>
                <textarea
                  required
                  id="form-message"
                  name="message"
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <button
                  type="submit"
                  className="text-white bg-blue-600 hover:bg-blue-700 rounded-lg text-sm px-5 py-2.5 font-medium"
                >
                  Submit
                </button>
                <p
                  id="form-error"
                  style={{ display: "none" }}
                  className="text-red-600 text-sm mt-3"
                >
                  Something went wrong. Please try again later.
                </p>
              </div>
            </fieldset>
          </form>
        </div>
      </div>

      <script dangerouslySetInnerHTML={{ __html: contactFormScript }} />
    </Layout>
  );
}
