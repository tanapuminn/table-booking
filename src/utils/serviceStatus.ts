import axios from "axios";
const baseURL = process.env.NEXT_PUBLIC_BASE_URL;

const checkServiceStatus = async (): Promise<boolean> => {
  try {
    const response = await axios.get(`${baseURL}/api/health-check`);
    return response.data.status === 'healthy';
  } catch (error) {
    console.error('Service status check failed:', error);
    return false;
  }
};

export default checkServiceStatus;