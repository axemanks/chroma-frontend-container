import { Outlet, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import {
  makeStyles,
  shorthands,
  tokens,
  Button,
  Text,
  Avatar,
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
} from '@fluentui/react-components';
import {
  SignOut24Regular,
  Person24Regular
} from '@fluentui/react-icons';
import { useAuth } from '../../hooks/useAuth';
import { AZURE_FUNCTIONS_URL } from '../../config/azureFunctionsConfig';
import { formatVersionDisplay, logVersionInfo } from '../../utils/version';

const useStyles = makeStyles({
  layout: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    backgroundColor: tokens.colorNeutralBackground1,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...shorthands.padding('16px', '24px'),
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
  },
  headerTitle: {
    fontSize: tokens.fontSizeBase600,
    fontWeight: tokens.fontWeightSemibold,
  },
  headerTitleSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '4px',
  },
  functionAppId: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForegroundOnBrand,
    opacity: '0.8',
    fontFamily: tokens.fontFamilyMonospace,
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  userName: {
    color: tokens.colorNeutralForegroundOnBrand,
  },
  main: {
    flex: 1,
    ...shorthands.padding('24px'),
    display: 'flex',
    flexDirection: 'column',
  },
});

const Layout = () => {
  const styles = useStyles();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Log version info on component mount (for debugging)
  useEffect(() => {
    logVersionInfo();
  }, []);

  // Extract function app identifier from URL (e.g., "func-nlli7eqzo247k" from the URL)
  const getFunctionAppId = (): string => {
    try {
      const url = new URL(AZURE_FUNCTIONS_URL);
      const hostname = url.hostname;
      // Extract the part before .azurewebsites.net
      const match = hostname.match(/^(.+)\.azurewebsites\.net$/);
      return match ? match[1] : hostname;
    } catch {
      return 'Unknown';
    }
  };

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={styles.headerTitleSection}>
          <Text className={styles.headerTitle}>
            Blue Edge Collections API Portal
          </Text>
          <Text className={styles.functionAppId}>
            Instance: {getFunctionAppId()} • {formatVersionDisplay()}
          </Text>
        </div>

        <div className={styles.userSection}>
          {user && (
            <>
              <Text className={styles.userName}>
                {user.name || user.username}
              </Text>
              <Menu>
                <MenuTrigger disableButtonEnhancement>
                  <Button
                    appearance="subtle"
                    icon={<Avatar name={user.name || user.username} size={28} />}
                  />
                </MenuTrigger>
                <MenuPopover>
                  <MenuList>
                    <MenuItem
                      icon={<Person24Regular />}
                      onClick={() => navigate('/profile')}
                    >
                      Profile
                    </MenuItem>
                    <MenuItem
                      icon={<SignOut24Regular />}
                      onClick={logout}
                    >
                      Sign out
                    </MenuItem>
                  </MenuList>
                </MenuPopover>
              </Menu>
            </>
          )}
        </div>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
