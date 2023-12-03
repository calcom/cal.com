import Link from "next/link";
import React, { useState, useRef, useEffect } from "react";

import { useGetTheme } from "@calcom/lib/hooks/useTheme";

import "./Chatbot.css";
import runTask from "./runTask";

type chatResponse = {
  type: string;
  url_param?: string;
  message?: string[];
  external_link?: string;
};

const FloatingIcon = () => {
  const ref = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const [isWindowOpen, setIsWindowOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [chatLog, setChatLog] = useState<chatResponse[]>([]);
  const { resolvedTheme, forcedTheme } = useGetTheme();
  const hasDarkTheme = !forcedTheme && resolvedTheme === "dark";

  const toggleWindow = () => {
    setIsWindowOpen(!isWindowOpen);
  };

  const handleInputChange = (e: any) => {
    setInputValue(e.target.value);
  };

  const scrollToBottom = () => {
    if (ref.current) {
      const scrollHeight = ref.current.scrollHeight;
      const clientHeight = ref.current.clientHeight;
      const maxScrollTop = scrollHeight - clientHeight;
      ref.current.scrollTop = maxScrollTop > 0 ? maxScrollTop : 0;
    }
  };

  // Scroll to bottom when the component mounts or when content changes
  useEffect(() => {
    scrollToBottom();
  }, [chatLog]);

  const handleConfirmClick = () => {
    // Handle the confirm button click, you can add your logic here

    // Update the chatLog state with the new entry
    if (inputValue === "") return;

    const responses: chatResponse[] = [];

    const currentResponse: chatResponse = {
      type: "human",
      url_param: "None",
      message: [inputValue],
    };
    setChatLog([...chatLog, currentResponse]);
    responses.push(currentResponse);
    loadingRef.current = true;
    const chatResponse = Promise.resolve(runTask(inputValue));

    chatResponse.then((value) => {
      const aiResponse: chatResponse = {
        type: "aiResponse",
        url_param: value.url_param ? value.url_param : "None",
        message: value.message,
        external_link: value.external_link ? value.external_link : "None",
      };

      responses.push(aiResponse);
      loadingRef.current = false;
      setChatLog([...chatLog, ...responses]);
    });

    setInputValue("");
  };

  const handleKeyDown = (event: any) => {
    if (event.key === "Enter" && inputValue !== "") {
      handleConfirmClick();
    }
  };

  const handleWindowClick = (e: any) => {
    // Stop the click event propagation within the window's content
    e.stopPropagation();
  };

  const renderChatLog = chatLog.map((val, idx) => {
    return val.type === "aiResponse" && val.url_param !== "None" && val.external_link !== "None" ? (
      <div key={idx} style={{ width: "100%", display: "inline-block", margin: "1rem 0 1rem 0" }}>
        {val.message?.map((msg, idx) => {
          return (
            <>
              <div
                key={msg + idx}
                style={{
                  width: "fit-content",
                  border: hasDarkTheme ? "2px solid white" : "2px solid black",
                  margin: "1rem 0 1rem 0",
                  borderRadius: "30px",
                  padding: "0.5rem 1rem",
                  maxWidth: "80%",
                }}>
                {msg}
              </div>
              {idx === 0 ? (
                <div
                  className="chatbot-button"
                  style={{
                    width: "fit-content",
                    border: hasDarkTheme ? "2px solid white" : "2px solid black",
                    margin: "1rem 0 1rem 0",
                    borderRadius: "30px",
                    padding: "0.5rem 1rem",
                    maxWidth: "80%",
                    backgroundColor: hasDarkTheme ? "#2b2b2b" : "#e5e7eb",
                  }}>
                  <Link href={val.url_param}>Got to Page</Link>
                </div>
              ) : idx === 1 ? (
                <div
                  className="chatbot-button"
                  style={{
                    width: "fit-content",
                    border: hasDarkTheme ? "2px solid white" : "2px solid black",
                    margin: "1rem 0 1rem 0",
                    borderRadius: "30px",
                    padding: "0.5rem 1rem",
                    maxWidth: "80%",
                    backgroundColor: hasDarkTheme ? "#2b2b2b" : "#e5e7eb",
                  }}>
                  <a target="_blank" href={val.external_link}>
                    Go to External Link
                  </a>
                </div>
              ) : (
                ""
              )}
            </>
          );
        })}
      </div>
    ) : val.type === "aiResponse" && val.external_link === "None" && val.url_param !== "None" ? (
      <div key={idx} style={{ width: "100%", display: "inline-block", margin: "1rem 0 1rem 0" }}>
        {val.message?.map((msg, idx) => {
          return (
            <div
              key={msg + idx}
              style={{
                width: "fit-content",
                border: hasDarkTheme ? "2px solid white" : "2px solid black",
                margin: "1rem 0 1rem 0",
                borderRadius: "30px",
                padding: "0.5rem 1rem",
                maxWidth: "80%",
              }}>
              {msg}
            </div>
          );
        })}
        <div
          className="chatbot-button"
          style={{
            width: "fit-content",
            border: hasDarkTheme ? "2px solid white" : "2px solid black",
            margin: "1rem 0 1rem 0",
            borderRadius: "30px",
            padding: "0.5rem 1rem",
            maxWidth: "80%",
            backgroundColor: hasDarkTheme ? "#2b2b2b" : "#e5e7eb",
          }}>
          <Link href={val.url_param}>Got to Page</Link>
        </div>
      </div>
    ) : val.type === "aiResponse" && val.url_param === "None" && val.external_link !== "None" ? (
      <div key={idx} style={{ width: "100%", display: "inline-block", margin: "1rem 0 1rem 0" }}>
        {val.message?.map((msg, idx) => {
          return (
            <div
              key={msg + idx}
              style={{
                width: "fit-content",
                border: hasDarkTheme ? "2px solid white" : "2px solid black",
                margin: "1rem 0 1rem 0",
                borderRadius: "30px",
                padding: "0.5rem 1rem",
                maxWidth: "80%",
              }}>
              {msg}
            </div>
          );
        })}
        <div
          className="chatbot-button"
          style={{
            width: "fit-content",
            border: hasDarkTheme ? "2px solid white" : "2px solid black",
            margin: "1rem 0 1rem 0",
            borderRadius: "30px",
            padding: "0.5rem 1rem",
            maxWidth: "80%",
            backgroundColor: hasDarkTheme ? "#2b2b2b" : "#e5e7eb",
          }}>
          <a target="_blank" href={val.external_link}>
            Go to External Link
          </a>
        </div>
      </div>
    ) : val.type === "aiResponse" && val.external_link === "None" && val.url_param === "None" ? (
      <div key={idx} style={{ width: "100%", display: "inline-block", margin: "1rem 0 1rem 0" }}>
        {val.message?.map((msg, idx) => {
          return (
            <div
              key={msg + idx}
              style={{
                width: "fit-content",
                border: hasDarkTheme ? "2px solid white" : "2px solid black",
                margin: "1rem 0 1rem 0",
                borderRadius: "30px",
                padding: "0.5rem 1rem",
                maxWidth: "80%",
              }}>
              {msg}
            </div>
          );
        })}
      </div>
    ) : (
      <div
        key={idx}
        style={{ width: "100%", display: "flex", justifyContent: "flex-end", margin: "1rem 0 1rem 0" }}>
        <div
          style={{
            width: "fit-content",
            border: hasDarkTheme ? "2px solid white" : "2px solid black",

            borderRadius: "30px",
            padding: "0.5rem 1rem",
            maxWidth: "80%",
          }}>
          {val.message}
        </div>
      </div>
    );
  });

  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        zIndex: 1000,
      }}
      onClick={toggleWindow}>
      {isWindowOpen && (
        <div
          style={{
            bottom: "10rem",
            right: "0",
            border: "1px solid #ccc",
            borderRadius: "50px",
            padding: "20px",
            backgroundColor: hasDarkTheme ? "#000" : "#fff",
            boxShadow: "0 2px 10px rgba(0, 0, 0, 0.2)",
            display: "block",
            position: "fixed",
            right: "20px",
            bottom: "8rem",
          }}
          onClick={handleWindowClick} // Handle click within the window
        >
          <div style={{ height: "60vh", width: "30vw", position: "relative" }}>
            <div
              ref={ref}
              style={{
                height: "90%",
                overflow: "scroll",
                paddingBottom: "5rem",
              }}
              className="chatblock">
              <>
                {renderChatLog}
                <div
                  style={{
                    width: "fit-content",
                    margin: "1rem 0 1rem 0",
                    borderRadius: "30px",
                    padding: "0.5rem 1rem",
                    maxWidth: "80%",
                  }}>
                  {loadingRef.current ? <div className="dot-flashing" /> : ""}
                </div>
              </>
            </div>
            <div style={{ width: "100%", position: "absolute", bottom: "0", marginBottom: "10px" }}>
              <input
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                placeholder="Enter text..."
                style={{
                  color: hasDarkTheme
                    ? "whitevscode-file://vscode-app/usr/share/code/resources/app/out/vs/code/electron-sandbox/workbench/workbench.html"
                    : "black",
                  background: hasDarkTheme ? "black" : "white",
                  border: hasDarkTheme ? "1px solid white" : "1px solid black",
                  borderRadius: "50px",
                  padding: "1rem 4rem 1rem 2rem",
                  width: "100%",
                }}
                onKeyDown={handleKeyDown}
              />
              <button
                className="chatbot-button"
                onClick={handleConfirmClick}
                style={{
                  color: hasDarkTheme ? "black" : "white",
                  background: hasDarkTheme ? "white" : "black",
                  borderRadius: "50px",
                  aspectRatio: "1",
                  height: "80%",
                  position: "absolute",
                  top: "10%",
                  right: "5px",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  fontSize: "1.5rem",
                }}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  stroke-width="2"
                  stroke="currentColor"
                  fill="none"
                  stroke-linecap="round"
                  stroke-linejoin="round">
                  <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                  <path d="M5 12l14 0" />
                  <path d="M13 18l6 -6" />
                  <path d="M13 6l6 6" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
      <div
        className="chatbot-button"
        style={{
          backgroundColor:
            (!isWindowOpen && hasDarkTheme) || (isWindowOpen && !hasDarkTheme) ? "white" : "black",
          borderRadius: "50%",
          width: "5rem",
          height: "5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "20px",
          boxShadow: "0 2px 10px rgba(0, 0, 0, 0.2)",
          transition: "background-color 0.3s ease",
          position: "absolute",
          right: "20px",
          bottom: "20px",
          cursor: "pointer",
        }}>
        {/* <!--!Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2023 Fonticons, Inc.--> */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          height="3rem"
          width="3.2rem"
          viewBox="0 0 640 512"
          style={{
            fill: (hasDarkTheme && !isWindowOpen) || (isWindowOpen && !hasDarkTheme) ? "black" : "white",
          }}>
          <path d="M320 0c17.7 0 32 14.3 32 32V96H472c39.8 0 72 32.2 72 72V440c0 39.8-32.2 72-72 72H168c-39.8 0-72-32.2-72-72V168c0-39.8 32.2-72 72-72H288V32c0-17.7 14.3-32 32-32zM208 384c-8.8 0-16 7.2-16 16s7.2 16 16 16h32c8.8 0 16-7.2 16-16s-7.2-16-16-16H208zm96 0c-8.8 0-16 7.2-16 16s7.2 16 16 16h32c8.8 0 16-7.2 16-16s-7.2-16-16-16H304zm96 0c-8.8 0-16 7.2-16 16s7.2 16 16 16h32c8.8 0 16-7.2 16-16s-7.2-16-16-16H400zM264 256a40 40 0 1 0 -80 0 40 40 0 1 0 80 0zm152 40a40 40 0 1 0 0-80 40 40 0 1 0 0 80zM48 224H64V416H48c-26.5 0-48-21.5-48-48V272c0-26.5 21.5-48 48-48zm544 0c26.5 0 48 21.5 48 48v96c0 26.5-21.5 48-48 48H576V224h16z" />
        </svg>
      </div>
    </div>
  );
};

export default FloatingIcon;
