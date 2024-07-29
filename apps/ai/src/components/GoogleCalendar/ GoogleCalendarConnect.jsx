import React, { useEffect } from 'react';
import { useHistory } from 'react-router-dom';

const GoogleCalendarConnect = () => {
  const history = useHistory();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');

    if (!code) {
      // Handle the cancellation
      console.error('Authorization was cancelled by the user.');
      // Redirect to a safe page or show a message to the user
      history.push('/safe-page'); // Replace with your safe page URL
      return;
    }

    // Proceed with the usual flow if code is present
    fetch(`https://api.cal.com/v2/calendars/google/save?code=${code}&state=${state}`)
      .then(response => response.json())
      .then(data => {
        // Handle the response
      })
      .catch(error => {
        console.error('Error:', error);
      });
  }, [history]);

  return (
    <div>
      {/* Your component's UI */}
    </div>
  );
};

export default GoogleCalendarConnect;
