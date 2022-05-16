import jsonLogic from "json-logic-js";
import { GetServerSidePropsContext } from "next";
import { useRouter } from "next/router";
import { getStoredRoutes, QueryBuilderConfig } from "pages/routing/Routing";
import { getStoredQuestions } from "pages/routing/create-form";
import { useState } from "react";
import { Utils as QbUtils } from "react-awesome-query-builder";

import { Button } from "@calcom/ui";

export default function Form() {
  const router = useRouter();
  const formId = router.query.formId;
  const storedQuestions = getStoredQuestions(formId);
  const [answers, setAnswers] = useState(() => {
    const _answers = {};
    storedQuestions.forEach((q) => {
      _answers[q.id] = "";
    });
    return _answers;
  });

  return (
    <div>
      {storedQuestions.map((question) => {
        if (question.type === "text") {
          return (
            <div key={question.id}>
              <div>{question.text}</div>
              <input
                type="text"
                onChange={(e) => {
                  setAnswers((answers) => {
                    const newAnswers = { ...answers };
                    newAnswers[question.id] = e.target.value;
                    return newAnswers;
                  });
                }}
                value={answers[question.id]}
              />
            </div>
          );
        } else {
          return <div>Unsupported Question Type: {question.type}</div>;
        }
      })}
      <Button
        onClick={() => {
          const routes = getStoredRoutes();
          let decidedAction = null;
          routes.some((route) => {
            const state = {
              tree: QbUtils.checkTree(QbUtils.loadTree(route.queryValue), QueryBuilderConfig),
              config: QueryBuilderConfig,
            };
            const jsonLogicQuery = QbUtils.jsonLogicFormat(state.tree, state.config);
            const logic = jsonLogicQuery.logic;
            let result: boolean;
            if (logic) {
              result = jsonLogic.apply(logic as any, answers);
            }
            if (result) {
              decidedAction = route.action;
              return true;
            }
          });
          if (decidedAction) {
            if (decidedAction.type === "customPageMessage") {
              alert(decidedAction.value);
            } else if (decidedAction.type === "eventTypeRedirectUrl") {
              router.push(`/${decidedAction.value}`);
            } else if (decidedAction.type === "externalRedirectUrl") {
              window.location.href = decidedAction.value;
            }
          } else {
            alert("No Matching Route found");
          }
        }}>
        Submit
      </Button>
    </div>
  );
}
// export const getServerSideProps = async (context: GetServerSidePropsContext) => {
//   const formId = context.query.formId;
// };
