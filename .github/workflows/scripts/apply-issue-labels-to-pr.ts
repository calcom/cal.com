const { Octokit } = require("@octokit/core");

async function applyLabelFromLinkedIssueToPR(pr, token) {
  const octokit = new Octokit({ auth: token });

  const query = `
    query GetLinkedIssues($owner: String!, $repo: String!, $prNumber: Int!) {
      repository(owner: $owner, name: $repo) {
        pullRequest(number: $prNumber) {
          closingIssuesReferences(first: 10) {
            nodes {
              number
              labels(first: 10) {
                nodes {
                  name
                }
              }
            }
          }
        }
      }
    }
  `;

  const { data } = await octokit.request('POST /graphql', {
    query,
    variables: {
      owner: pr.base.repo.owner.login,
      repo: pr.base.repo.name,
      prNumber: pr.number,
    },
  });

  const linkedIssues =
    data.repository.pullRequest.closingIssuesReferences.nodes;

  if (linkedIssues.length === 0) {
    console.log("No issue linked.");
    return;
  }

  for (const issue of linkedIssues) {
    const labels = issue.labels.nodes.map((label) => label.name);

    if (labels.length === 0) {
      console.log(`No labels found on the linked issue #${issue.number}.`);
      continue;
    }

    await octokit.request(
      "POST /repos/{owner}/{repo}/issues/{issue_number}/labels",
      {
        owner: pr.base.repo.owner.login,
        repo: pr.base.repo.name,
        issue_number: pr.number,
        labels: labels,
      }
    );

    console.log(
      `Applied labels: ${labels.join(", ")} to PR#${
        pr.number
      } from linked issue #${issue.number}`
    );
  }
}

(async () => {
  if (!process.env.PR_DATA) {
    console.log("No PR data found.");
    return;
  }

  const token = process.env.GITHUB_TOKEN;
  const prData = JSON.parse(process.env.PR_DATA);

  await applyLabelFromLinkedIssueToPR(prData, token);
})();
