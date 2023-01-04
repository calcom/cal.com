export const CallToActionTable = (props: { children: React.ReactNode }) => (
  <table>
    <tbody>
      <tr>
        <td
          align="center"
          role="presentation"
          style={{
            border: "none",
            borderRadius: "3px",
            cursor: "auto",
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            msoPaddingAlt: "10px 25px",
          }}
          valign="middle">
          {props.children}
        </td>
      </tr>
    </tbody>
  </table>
);
