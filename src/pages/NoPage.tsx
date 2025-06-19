import { useNavigate } from 'react-router-dom';
import { Text, Button } from '@fluentui/react-components';

const NoPage = () => {
  const navigate = useNavigate();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      gap: '20px'
    }}>
      <Text size={800}>404 - Page Not Found</Text>      <Button
        appearance="primary"
        onClick={() => navigate('/chroma')}
      >
        Go to Chroma Admin
      </Button>
    </div>
  );
};

export default NoPage;
