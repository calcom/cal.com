const getRunningLateLink = (phoneNumber: string): string => {
  const cleanedPhoneNumber = phoneNumber.replace(/\D/g, "");
  const urlEndcodedTextMessage = encodeURIComponent(`Hi, I'm running late by 5 minutes. I'll be there soon.`);

  const whatsappLink = `https://api.whatsapp.com/send?phone=${cleanedPhoneNumber}&text=${urlEndcodedTextMessage}`;

  return whatsappLink;
};

export default getRunningLateLink;
