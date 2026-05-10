declare module "@paystack/inline-js" {
  type CallbackResponse = {
    reference: string;
    status?: string;
    transaction?: string;
    trxref?: string;
  };

  type ResumeOptions = {
    onSuccess?: (response: CallbackResponse) => void;
    onCancel?: () => void;
    onError?: (error: { message?: string; type?: string }) => void;
  };

  class PaystackPop {
    resumeTransaction(accessCode: string, options?: ResumeOptions): void;
  }

  export default PaystackPop;
}
