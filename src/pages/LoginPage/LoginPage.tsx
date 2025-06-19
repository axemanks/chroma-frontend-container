import { Navigate, useLocation } from 'react-router-dom';
import {
  Button,
  Text,
  makeStyles,
  shorthands,
  tokens
} from '@fluentui/react-components';
import { useAuth } from '../../hooks/useAuth';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    backgroundColor: tokens.colorNeutralBackground2,
    gap: '24px',
    ...shorthands.padding('20px'),
  },
  title: {
    fontSize: tokens.fontSizeBase600,
    fontWeight: tokens.fontWeightSemibold,
    textAlign: 'center',
    color: tokens.colorNeutralForeground1,
  },
  subtitle: {
    fontSize: tokens.fontSizeBase300,
    textAlign: 'center',
    color: tokens.colorNeutralForeground2,
  },
});

const LoginPage = () => {
  const styles = useStyles();
  const { isAuthenticated, login } = useAuth();
  const location = useLocation();

  // Get the intended destination from router state
  const from = location.state?.from?.pathname || '/chroma';

  // If already authenticated, redirect to intended destination
  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleLogin = () => {
    login();
  };

  return (
    <div className={styles.container}>
      <Text className={styles.title}>
        Blue Edge Collections API Portal
      </Text>
      <Text className={styles.subtitle}>
        Sign in with your Microsoft account to continue
      </Text>
      <Button
        appearance="primary"
        size="large"
        onClick={handleLogin}
      >
        Sign in with Microsoft
      </Button>
    </div>
  );
};

export default LoginPage;
