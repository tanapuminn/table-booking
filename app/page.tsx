"use client"
import React from "react"
import { useEffect, useState } from "react"
import Maintenance from "@/src/components/Maintenance"
import checkServiceStatus from "@/src/utils/serviceStatus"
import HomePage from "@/src/components/HomePage"

export default function DefaultPage() {
  const [isServiceAvailable, setIsServiceAvailable] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      const status = await checkServiceStatus();
      console.log("Service status:", status);
      setIsServiceAvailable(status);
    };

    checkStatus();
    // Check status every 30 seconds
    const interval = setInterval(checkStatus, 300000); //5 minutes

    return () => clearInterval(interval);
  }, []);

  if (isServiceAvailable) {
    return <HomePage/>
  } 
  return <Maintenance />;
}
