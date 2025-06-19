import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { RouterProvider } from 'react-router-dom';
import { MsalProvider } from '@azure/msal-react';
import { router } from './router';
import { msalInstance } from './config/authConfig';

function App() {
  return (
    <MsalProvider instance={msalInstance}>
      <FluentProvider theme={webLightTheme}>
        <RouterProvider router={router} />
      </FluentProvider>
    </MsalProvider>
  );
}

export default App;
