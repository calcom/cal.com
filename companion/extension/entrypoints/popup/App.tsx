import React from 'react';

export default function App() {
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Cal.com Companion</h1>
      <p style={styles.subtitle}>Your calendar companion for quick booking and scheduling</p>
      <div style={styles.buttonContainer}>
        <button style={styles.button}>Quick Schedule</button>
        <button style={styles.button}>View Calendar</button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    height: '100%',
    minHeight: '450px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '10px',
    color: '#333',
    margin: '0 0 10px 0',
  },
  subtitle: {
    fontSize: '14px',
    textAlign: 'center' as const,
    color: '#666',
    marginBottom: '20px',
  },
  buttonContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
    width: '100%',
    maxWidth: '200px',
  },
  button: {
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '12px 20px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
};