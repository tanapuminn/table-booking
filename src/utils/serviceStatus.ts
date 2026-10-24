import axios from "axios";
import { apiBaseUrl as baseURL } from "@/lib/api";

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
