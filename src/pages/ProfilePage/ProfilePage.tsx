import {
  makeStyles,
  shorthands,
  tokens,
  Card,
  Text,
  Avatar,
  Badge,
  Divider,
  Button,
} from '@fluentui/react-components';
import {
  Person24Regular,
  Mail24Regular,
  Building24Regular,
  Calendar24Regular,
  Shield24Regular,
  EditRegular,
  ArrowLeft24Regular,
} from '@fluentui/react-icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { formatVersionDisplay } from '../../utils/version';
import { AZURE_FUNCTIONS_URL } from '../../config/azureFunctionsConfig';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  pageHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '8px',
  },
  pageTitle: {
    fontSize: tokens.fontSizeBase600,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  backButton: {
    marginRight: 'auto',
  },
  cardsContainer: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: '24px',
    '@media (max-width: 768px)': {
      gridTemplateColumns: '1fr',
    },
  },
  profileCard: {
    ...shorthands.padding('24px'),
    backgroundColor: tokens.colorNeutralBackground1,
  },
  profileHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
    marginBottom: '24px',
  },
  avatarSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  userInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  userName: {
    fontSize: tokens.fontSizeBase500,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  userRole: {
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground2,
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px',
  },
  infoItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    ...shorthands.padding('12px'),
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
  },
  infoIcon: {
    color: tokens.colorBrandForeground1,
  },
  infoContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  infoLabel: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
    fontWeight: tokens.fontWeightMedium,
  },
  infoValue: {
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground1,
    wordBreak: 'break-all',
  },
  systemCard: {
    ...shorthands.padding('20px'),
    backgroundColor: tokens.colorNeutralBackground1,
  },
  systemTitle: {
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    marginBottom: '16px',
  },
  badgeContainer: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    marginTop: '8px',
  },
  editButton: {
    alignSelf: 'flex-start',
  },
});

const ProfilePage = () => {
  const styles = useStyles();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className={styles.container}>
        <Text>No user information available.</Text>
      </div>
    );
  }

  // Format the login timestamp
  const formatDate = (timestamp?: string | number) => {
    if (!timestamp) return 'Unknown';
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch {
      return 'Unknown';
    }
  };

  // Extract function app identifier from URL
  const getFunctionAppId = (): string => {
    try {
      const url = new URL(AZURE_FUNCTIONS_URL);
      const hostname = url.hostname;
      const match = hostname.match(/^(.+)\.azurewebsites\.net$/);
      return match ? match[1] : hostname;
    } catch {
      return 'Unknown';
    }
  };

  // Get user roles/claims if available
  const getUserRoles = () => {
    const roles = Array.isArray(user.idTokenClaims?.roles) ? user.idTokenClaims.roles : [];
    const groups = Array.isArray(user.idTokenClaims?.groups) ? user.idTokenClaims.groups : [];
    return [...roles, ...groups];
  };

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <Button
          className={styles.backButton}
          appearance="subtle"
          icon={<ArrowLeft24Regular />}
          onClick={() => navigate(-1)}
        >
          Back
        </Button>
        <Person24Regular />
        <Text className={styles.pageTitle}>User Profile</Text>
      </div>

      <div className={styles.cardsContainer}>
        {/* Main Profile Card */}
        <Card className={styles.profileCard}>
          <div className={styles.profileHeader}>
            <div className={styles.avatarSection}>
              <Avatar
                name={user.name || user.username || 'User'}
                size={72}
              />
              <Badge appearance="filled" color="brand">
                Authenticated
              </Badge>
            </div>

            <div className={styles.userInfo}>
              <Text className={styles.userName}>
                {user.name || user.username || 'Unknown User'}
              </Text>
              <Text className={styles.userRole}>
                {user.idTokenClaims?.jobTitle || 'User'}
              </Text>
              <Button
                className={styles.editButton}
                appearance="outline"
                icon={<EditRegular />}
                size="small"
                disabled
              >
                Edit Profile (Coming Soon)
              </Button>
            </div>
          </div>

          <Divider />

          {/* User Information Grid */}
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <Mail24Regular className={styles.infoIcon} />
              <div className={styles.infoContent}>
                <Text className={styles.infoLabel}>Email</Text>
                <Text className={styles.infoValue}>
                  {user.username || 'Not available'}
                </Text>
              </div>
            </div>

            <div className={styles.infoItem}>
              <Building24Regular className={styles.infoIcon} />
              <div className={styles.infoContent}>
                <Text className={styles.infoLabel}>Tenant</Text>
                <Text className={styles.infoValue}>
                  {user.tenantId || 'Not available'}
                </Text>
              </div>
            </div>

            <div className={styles.infoItem}>
              <Calendar24Regular className={styles.infoIcon} />
              <div className={styles.infoContent}>
                <Text className={styles.infoLabel}>Last Login</Text>
                <Text className={styles.infoValue}>
                  {formatDate(user.idTokenClaims?.auth_time)}
                </Text>
              </div>
            </div>

            <div className={styles.infoItem}>
              <Shield24Regular className={styles.infoIcon} />
              <div className={styles.infoContent}>
                <Text className={styles.infoLabel}>User ID</Text>
                <Text className={styles.infoValue}>
                  {user.localAccountId || user.homeAccountId || 'Not available'}
                </Text>
              </div>
            </div>
          </div>

          {/* Roles/Groups if available */}
          {getUserRoles().length > 0 && (
            <>
              <Divider />
              <div>
                <Text className={styles.infoLabel}>Roles & Groups</Text>
                <div className={styles.badgeContainer}>
                  {getUserRoles().map((role, index) => (
                    <Badge key={index} appearance="outline">
                      {role}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </Card>

        {/* System Information Card */}
        <Card className={styles.systemCard}>
          <Text className={styles.systemTitle}>System Information</Text>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <Building24Regular className={styles.infoIcon} />
              <div className={styles.infoContent}>
                <Text className={styles.infoLabel}>Function App Instance</Text>
                <Text className={styles.infoValue}>
                  {getFunctionAppId()}
                </Text>
              </div>
            </div>

            <div className={styles.infoItem}>
              <Calendar24Regular className={styles.infoIcon} />
              <div className={styles.infoContent}>
                <Text className={styles.infoLabel}>Application Version</Text>
                <Text className={styles.infoValue}>
                  {formatVersionDisplay()}
                </Text>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ProfilePage;
