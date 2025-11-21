import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Platform } from 'react-native';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: '#fff', padding: 20, justifyContent: 'center' }}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 10, color: '#dc2626' }}>
            Oops! Something went wrong
          </Text>
          <Text style={{ fontSize: 16, marginBottom: 20, color: '#4b5563' }}>
            The app encountered an error. Please try again.
          </Text>
          
          {__DEV__ && this.state.error && (
            <ScrollView style={{ flex: 1, marginBottom: 20, backgroundColor: '#f3f4f6', padding: 10, borderRadius: 8 }}>
              <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 12, color: '#991b1b' }}>
                {this.state.error.toString()}
              </Text>
              {this.state.errorInfo && (
                <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 10, color: '#7f1d1d', marginTop: 10 }}>
                  {this.state.errorInfo.componentStack}
                </Text>
              )}
            </ScrollView>
          )}

          <TouchableOpacity
            onPress={this.resetError}
            style={{
              backgroundColor: '#2563eb',
              padding: 15,
              borderRadius: 8,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

