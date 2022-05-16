import { TrashIcon } from "@heroicons/react/solid";
import { useState } from "react";
import { v4 as uuidv4 } from "uuid";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui";

import NavTabs from "@components/NavTabs";
import RoutingShell from "@components/RoutingShell";
import Shell from "@components/Shell";
import CheckboxField from "@components/ui/form/CheckboxField";

function Question({ question, updateQuestion, deleteQuestion, readonly = false }) {
  return (
    <div className="mt-10 flex justify-around">
      <div className="flex flex-col">
        <input
          type="text"
          value={question.text}
          onChange={(e) => {
            updateQuestion({
              ...question,
              text: e.target.value,
            });
          }}
          placeholder="Write a question"></input>
        <CheckboxField label="Required Field"></CheckboxField>
      </div>
      <div>
        <Button
          StartIcon={TrashIcon}
          onClick={() => {
            deleteQuestion();
          }}
          color="secondary">
          Delete
        </Button>
      </div>
    </div>
  );
}
const setStoredQuestions = (questions) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("questions", JSON.stringify(questions));
  }
};

/**
 *
 * @param formId Not being used right now
 * @returns
 */
export const getStoredQuestions = (formId) => {
  if (typeof window !== "undefined") {
    return JSON.parse(localStorage.getItem("questions") || "[]");
  }
  return [];
};

export default function FormBuilder() {
  const [questions, setQuestions] = useState(getStoredQuestions());
  return (
    <RoutingShell>
      {questions.map((question, key) => {
        return (
          <Question
            updateQuestion={(question) => {
              setQuestions(() => {
                const index = questions.findIndex((q) => q.id === question.id);
                const newQuestions = [...questions];
                newQuestions[index] = { ...newQuestions[index], ...question };
                setStoredQuestions(newQuestions);
                return newQuestions;
              });
            }}
            deleteQuestion={() => {
              setQuestions(() => {
                const newQuestions = questions.filter((q) => q.id !== question.id);
                setStoredQuestions(newQuestions);
                return newQuestions;
              });
            }}
            key={key}
            question={question}></Question>
        );
      })}
      <Button
        onClick={() => {
          setQuestions((questions) => {
            const newQuestions = [
              ...questions,
              {
                // TODO: Should we give it a DB id?
                id: uuidv4(),
                // This is same type from react-awesome-query-builder
                type: "text",
                text: "Hello",
              },
            ];
            setStoredQuestions(newQuestions);
            return newQuestions;
          });
        }}>
        Add Question
      </Button>
    </RoutingShell>
  );
}
