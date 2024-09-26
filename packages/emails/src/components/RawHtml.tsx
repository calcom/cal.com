/** @see https://gist.github.com/zomars/4c366a0118a5b7fb391529ab1f27527a */
const RawHtml = ({ html = "" }) => (
  <script dangerouslySetInnerHTML={{ __html: `</script>${html}<script>` }} />
);

export default RawHtml;
