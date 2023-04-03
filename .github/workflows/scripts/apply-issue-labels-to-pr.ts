async function applyLabelFromLinkedIssueToPR(pr, token) {
  // Fetch the labels of all issues linked to the PR
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

  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      query,
      variables: {
        owner: pr.base.repo.owner.login,
        repo: pr.base.repo.name,
        prNumber: pr.number
      },
    }),
  });

  const { data } = await response.json();

  const linkedIssues = data?.repository?.pullRequest?.closingIssuesReferences?.nodes;

  if (!linkedIssues || linkedIssues.length === 0) {
    console.log("No issue linked.");
    return;
  }

  for (const issue of linkedIssues) {
    const labels = issue.labels.nodes.map((label) => label.name);

    if (labels.length === 0) {
      console.log(`No labels found on the linked issue #${issue.number}.`);
      continue;
    }

    await fetch(`https://api.github.com/repos/${pr.base.repo.owner.login}/${pr.base.repo.name}/issues/${pr.number}/labels`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ labels }),
    });

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

  const prData = JSON.parse(process.env.PR_DATA);
  const token = process.env.GITHUB_TOKEN;

  await applyLabelFromLinkedIssueToPR(prData, token);
})();
