import invoice from "@node-lightning/invoice";
import fetch from "node-fetch";

const fetchInvoiceFromLnName = async (lnName: string, amount: number) => {
  const splits = lnName.split("@");
  if (splits.length <= 1) {
    return false;
  }
  const username = splits[0];
  const domain = splits[1];

  const req = await fetch(`https://${domain}/.well-known/lnurlp/${username}`);
  const resData = await req.json();
  if (req.status === "ERROR" || !resData) {
    return false;
  }
  // amount is given in msats: 1 satoshi = 1000 msats
  // This fetch needs a cors redirect  when it does not run on a backend server
  const invoiceData = await fetch(`${resData.callback}?amount=${amount * 1000}`);
  const invoiceResData = await invoiceData.json();
  if (invoiceData.status === "ERROR" || !invoiceResData || invoiceResData.error) {
    throw new Error("Invalid Invoice");
  }
  try {
    const result = invoice.decode(invoiceResData.pr);
    if (result) {
      if (parseInt(result.valueSat) === amount) {
        // returns the invoice
        return invoiceResData.pr;
      } else {
        throw new Error("Invoice does not match input");
      }
    }
    throw new Error("Invalid Invoice");
  } catch (ex) {
    throw new Error(`Undefined error: ${ex}`);
  }
};

export default fetchInvoiceFromLnName;
