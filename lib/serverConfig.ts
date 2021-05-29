
function detectTransport(): string | any {

  if (process.env.EMAIL_SERVER) {
    return process.env.EMAIL_SERVER;
  }

  if (process.env.EMAIL_SERVER_HOST) {
    const port = parseInt(process.env.EMAIL_SERVER_PORT);
    const transport = {
      host: process.env.EMAIL_SERVER_HOST,
      port,
      auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
      },
      secure: (port === 465),
    };

    return transport;
  }

  return {
    sendmail: true,
    newline: 'unix',
    path: '/usr/sbin/sendmail'
  };
}

export const serverConfig = {
  transport: detectTransport(),
  from: process.env.EMAIL_FROM,
};