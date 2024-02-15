import ThumbUp from "@components/icons-alt/thumb-up"
import ThumbDown from "@components/icons-alt/thumb-down"
import Tippy from '@tippyjs/react'
import { useState, useCallback, useRef, useEffect } from "react"
import toast, { Toaster, ToastBar } from "react-hot-toast"

export const TooltipContent = ({ path, yes, onDone, formspreeId }) => {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [email, setEmail] = useState("")
  const textAreaRef = useRef()
  const textInputRef = useRef()

  const isValidEmail = (email) => {
    const pattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    return pattern.test(email);
  };

  const feedbackBody = {
    "response": {
      data: {
        "syxu88c4wv1zhqazhml9l0j5": yes ? "Yes" : "No",
        "ebbrnnqqop9gmr3ffv7ges57": message,
        "q5xgwccqnzuftv0krqj4eho0": path,
        "hu5zc76pacp9kqm6r2g53hyh": email === "" ? "anonymous" : email
      },
      finished: true,
    },
    "surveyId": "clfwp7dol000iqo0hts34g3p7"
  }

  const submitFeedback = useCallback(async () => {
      // If the email field is not empty and is invalid
      if (email !== "" && !isValidEmail(email)) {
        toast.error('Please enter a valid email or leave it blank.');
        return;
      }
      await fetch(`https://app.formbricks.com/api/v1/client/environments/clfwouqse0003mk0gfdd8r6qx/responses`, {
          method: "POST",
          body: JSON.stringify(feedbackBody),
          headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }
        });
        toast.success('Thanks for your feedback!');
        onDone?.()
        setMessage("")
  }, [message, yes, onDone, formspreeId])

  return <div className="rounded-lg bg-white dark:bg-neutral-800 p-4 shadow-xl flex flex-col gap-2 border dark:border-white/20">
      <p className="text-sm">Your email (optional)</p>
      <span className="-mt-1 mb-1 text-xs text-gray-400">For follow-ups and quick resolutions</span>
      <input
        type="email"
        ref={textInputRef}
        value={email}
        disabled={loading}
        onChange={(e) => {
          setEmail(e.target.value)
          }
        }
        className="p-2 border rounded-md outline-none w-full resize-none text-sm dark:border-white/20"
      />
      <p className="text-sm">Leave a comment (optional)</p>
      <textarea
        ref={textAreaRef}
        autoFocus={true}
        rows={4}
        value={message}
        disabled={loading}
        onChange={(e) => setMessage(e.target.value)}
        className="p-2 border rounded-md outline-none w-full resize-none text-sm dark:border-white/20"
      />
      <button
        type="submit"
        onClick={submitFeedback}
        disabled={loading}
        className="text-white rounded-md bg-primary-500 hover:bg-primary-600 transition duration-200 w-full text-sm px-2 py-1.5 outline-none">
        Submit
      </button>
    </div>
}

export const TooltipWrapper = ({ children, path, yes, visible, onClickOutside, onDone }) => {

  return <Tippy
      visible={visible}
      onClickOutside={onClickOutside}
      content={<TooltipContent
          path={path}
          yes={!!yes}
          onDone={onDone}
        />}
      delay={[0, 0]}
      duration={[300, 0]}
      // trigger="click"
      interactive
      className="w-[300px]"
    >
      {children}
    </Tippy>
}

export const Feedback = ({ path }) => {
  const [yesVisible, setYesVisible] = useState(false)
  const [noVisible, setNoVisible] = useState(false)

  return <div className="rounded-md p-3 flex flex-row gap-2 items-center text-neutral-600 dark:text-white/80 border dark:border-white/20 w-min">
      <p className="text-base truncate mr-2">Was this page helpful?</p>
      <TooltipWrapper
        path={path}
        yes
        onDone={() => setYesVisible(false)}
        visible={yesVisible}
        onClickOutside={() => setYesVisible(false)}>
        <button
          onClick={() => setYesVisible(!yesVisible)}
          className="border rounded-md px-2 py-1 flex flex-row items-center gap-2 hover:bg-neutral-100 dark:hover:bg-white/10 transition duration-200 outline-none dark:border-white/20">
          <ThumbUp className="w-4 h-4" />
          <p className="font-semibold text-base">Yes</p>
        </button>
      </TooltipWrapper>
      <TooltipWrapper
        path={path}
        visible={noVisible}
        onDone={() => setNoVisible(false)}
        onClickOutside={() => setNoVisible(false)}>
        <button
          onClick={() => setNoVisible(!noVisible)}
          className="border rounded-md px-2 py-1 flex flex-row items-center gap-2 hover:bg-neutral-100 transition duration-200 outline-none dark:border-white/20">
          <ThumbDown className="w-4 h-4" />
          <p className="font-semibold text-base">No</p>
        </button>
      </TooltipWrapper>
      <Toaster
        position="bottom-center"
        toastOptions={{
          className: 'shadow-md rounded-md text-sm text-white bg-neutral-900',
          success: { icon: null },
          error: { icon: null },
        }}>
        {(t) => (
          <ToastBar
            toast={t}
            style={{
              ...t.style,
              animation: t.visible ? 'toast-enter 0.2s ease-out' : 'toast-exit 0.5s ease-in forwards',
            }}
          />
        )}
      </Toaster>
    </div>
}
