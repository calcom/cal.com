import axios from "axios";
import { ChatOpenAI } from "langchain/chat_models/openai";
import type { GetServerSidePropsContext } from "next";
import Image from "next/image";
import React, { useState, useEffect } from "react";
import AudioPlayer from "react-audio-player";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";

import { getLayout } from "@calcom/features/MainLayout";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { ShellMain } from "@calcom/features/shell/Shell";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button, Divider, Input } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

import { ssrInit } from "@server/lib/ssr";

import lex_pause from "./lex_pause.png";
import lex_speak from "./lex_speak.gif";

function Teams() {
  const { t } = useLocale();
  const [user] = trpc.viewer.me.useSuspenseQuery();

  return (
    <ShellMain
      heading={t("AI Agents")}
      hideHeadingOnMobile
      subtitle={t("Create and Manage Automated AI Agents")}
      CTA={
        (!user.organizationId || user.organization.isOrgAdmin) && (
          // <Button
          //   data-testid="new-team-btn"
          //   variant="fab"
          //   StartIcon={Plus}
          //   type="button">
          //   {t("new")}
          // </Button>
          <></>
        )
      }>
      <Agents />
    </ShellMain>
  );
}

const InteractionWindow = ({ textContent, onClose }) => {
  const [userInput, setUserInput] = useState("");
  const [chatModelResult, setChatModelResult] = useState("");
  const [message, setMessage] = useState("");
  const [audioURL, setAudioURL] = useState(null);
  const [audioStopped, setAudioStopped] = useState(false);

  const commands = [
    {
      command: "reset",
      callback: () => resetTranscript(),
    },
    {
      command: "shut up",
      callback: () => setMessage("I wasn't talking."),
    },
    {
      command: "Hello",
      callback: () => setMessage("Hi there!"),
    },
  ];

  const { transcript, interimTranscript, finalTranscript, resetTranscript, listening } = useSpeechRecognition(
    { commands }
  );

  useEffect(() => {
    if (finalTranscript !== "") {
      console.log(transcript);
    }
  }, [interimTranscript, finalTranscript]);

  if (!SpeechRecognition.browserSupportsSpeechRecognition()) {
    return null;
  }

  const chatModel = new ChatOpenAI({
    openAIApiKey: "",
  });

  const handleUserInput = (event) => {
    setUserInput(event.target.value);
  };

  const handlePredict = async () => {
    const result = await chatModel.predict(
      `${textContent}use this context to answer the following in in 2 sentence${finalTranscript}`
    );
    resetTranscript();
    setChatModelResult(result);
    handleAudioFetch(result);
  };

  if (!SpeechRecognition.browserSupportsSpeechRecognition()) {
    console.log("Your browser does not support speech recognition software! Try Chrome desktop, maybe?");
  }

  const listenContinuously = () => {
    SpeechRecognition.startListening({
      continuous: true,
      language: "en-GB",
    });
  };

  const textToSpeech = async (inputText) => {
    const API_KEY = "";
    const VOICE_ID = "YJ2fWaaQs5Ynj0tC4W0B";
    const options = {
      method: "POST",
      url: `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      headers: {
        accept: "audio/mpeg",
        "content-type": "application/json",
        "xi-api-key": `${API_KEY}`,
      },
      data: {
        text: inputText,
      },
      responseType: "arraybuffer",
    };

    const speechDetails = await axios.request(options);

    return speechDetails.data;
  };

  const handleAudioFetch = async (text) => {
    const data = await textToSpeech(text);
    const blob = new Blob([data], { type: "audio/mpeg" });
    const url = URL.createObjectURL(blob);
    setAudioURL(url);
  };

  return (
    <div>
      <div>
        <div>
          <span>listening: {listening ? "on" : "off"}</span>
          <div>
            <button type="button" onClick={resetTranscript}>
              Reset
            </button>
            <button type="button" onClick={listenContinuously}>
              Listen
            </button>
            <button type="button" onClick={SpeechRecognition.stopListening}>
              Stop
            </button>
          </div>
        </div>
        <div>{message}</div>
        <div>
          <span>{transcript}</span>
        </div>
      </div>
      <input type="text" value={userInput} onChange={handleUserInput} placeholder="Type your message" />
      <button onClick={handlePredict}>Test</button>
      <div>
        <strong>Results:</strong> <div>{chatModelResult}</div>
      </div>
      <div>
        {audioURL && (
          <>
            <AudioPlayer
              src={audioURL}
              autoPlay={true}
              controls
              onPlay={() => setAudioStopped(false)}
              onEnded={() => setAudioStopped(true)}
            />
            {audioStopped ? (
              <Image width={500} height={500} src={lex_pause} />
            ) : (
              <Image width={500} height={500} src={lex_speak} />
            )}
          </>
        )}
      </div>
      <button onClick={onClose}>Close</button>
    </div>
  );
};

const Agents = () => {
  const [agents, setAgents] = useState([]);
  const [agentName, setAgentName] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [textFile, setTextFile] = useState(null);

  const [interactionWindowVisible, setInteractionWindowVisible] = useState(false);

  const handleNameChange = (event) => {
    setAgentName(event.target.value);
  };

  const handleImageChange = (event) => {
    setImageFile(event.target.files[0]);
  };

  const handleAudioChange = (event) => {
    setAudioFile(event.target.files[0]);
  };

  const handleTextChange = (event) => {
    setTextFile(event.target.files[0]);
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();

      reader.onload = (e) => {
        // Read the content of the file
        const fileContent = e.target.result;

        // Store the file content in your component state or do something with it
        console.log("File Content:", fileContent);

        // Now you can use the file content as needed, for example, update state:
        setTextFile({ file, content: fileContent });
      };

      // Read the file as text
      reader.readAsText(file);
    }
  };

  console.log(textFile);

  const handleSubmit = (event) => {
    event.preventDefault();

    // Create a new agent object with the provided information
    const newAgent = {
      name: agentName,
      image: imageFile,
      audio: audioFile,
      text: textFile,
    };

    // Update the list of agents
    setAgents([...agents, newAgent]);

    // Clear the form fields
    setAgentName("");
    setImageFile(null);
    setAudioFile(null);
    setTextFile(null);
  };

  const handleInteract = (textContent) => {
    // Open the interaction window and pass the text content
    setInteractionWindowVisible(true);
    setTextFile(textContent);
  };

  const handleCloseInteractionWindow = () => {
    // Close the interaction window
    setInteractionWindowVisible(false);
  };

  return (
    <div>
      <div className="flex-direction: column flex justify-center">
        <div className="flex-direction: column w-17 flex">
          <div>
            <form onSubmit={handleSubmit} class="mx-auto mt-8 max-w-md rounded bg-black p-8 shadow-md">
              <label class="mb-4 block">
                <span class="text-white">Name:</span>
                <Input
                  type="text"
                  value={agentName}
                  onChange={handleNameChange}
                  class="form-input mt-1 block w-full rounded-md bg-white text-black"
                />
              </label>

              <label class="mb-4 block">
                <span class="text-white">Image:</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  class="form-input mt-1 block w-full rounded-md text-black"
                />
              </label>

              <label class="mb-4 block">
                <span class="text-white">Audio:</span>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleAudioChange}
                  class="form-input mt-1 block w-full rounded-md text-black"
                />
              </label>

              <label class="mb-4 block">
                <span class="text-white">Text:</span>
                <input
                  type="file"
                  accept=".txt"
                  onChange={handleTextChange}
                  class="form-input mt-1 block w-full rounded-md text-black"
                />
              </label>

              <Button type="submit" class="w-full rounded bg-white px-4 py-2 text-black">
                Create Agent
              </Button>
            </form>
          </div>
        </div>
      </div>
      <div />

      <Divider />
      <div>
        <p class="text-lg font-bold">Test agents</p>
        <ul className="flex flex-wrap">
          {agents.map((agent, index) => (
            <li key={index} className="m-2 w-64 rounded-md border border-gray-300 p-4">
              <div>
                <p>
                  <strong>Agent Name:</strong> {agent.name}
                </p>
                <p>
                  <strong>Image:</strong> {agent.image ? agent.image.name : "N/A"}
                </p>
                <p>
                  <strong>Audio:</strong> {agent.audio ? agent.audio.name : "N/A"}
                </p>
                <p>
                  <strong>Text:</strong> {agent.text ? agent.text.name : "N/A"}
                </p>
              </div>
              <button
                className="mt-4 w-full cursor-pointer rounded bg-white px-4 py-2 text-black"
                onClick={() => handleInteract(agent.text.content)}>
                Interact
              </button>
            </li>
          ))}
        </ul>
      </div>

      {interactionWindowVisible && (
        <InteractionWindow textContent={textFile} onClose={handleCloseInteractionWindow} />
      )}
    </div>
  );
};

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const ssr = await ssrInit(context);
  await ssr.viewer.me.prefetch();
  const session = await getServerSession({ req: context.req, res: context.res });
  const token = Array.isArray(context.query?.token) ? context.query.token[0] : context.query?.token;

  const callbackUrl = token ? `/teams?token=${encodeURIComponent(token)}` : null;

  if (!session) {
    return {
      redirect: {
        destination: callbackUrl ? `/auth/login?callbackUrl=${callbackUrl}` : "/auth/login",
        permanent: false,
      },
      props: {},
    };
  }

  return { props: { trpcState: ssr.dehydrate() } };
};

Teams.requiresLicense = false;
Teams.PageWrapper = PageWrapper;
Teams.getLayout = getLayout;
export default Teams;
