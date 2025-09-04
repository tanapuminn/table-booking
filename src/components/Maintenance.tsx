import React from 'react';
import styles from './Maintenance.module.css';
import maintainImg from '../../public/images/maintain.gif';

const Maintenance: React.FC = () => {
  return (
    <div className={`${styles.maintenanceContainer} min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100`}>
      <div className="text-center p-3 max-w-lg">
        <img src={maintainImg.src} alt="Maintenance" className="mb-8 w-auto h-auto" />
        <h1 className="text-2xl font-bold text-red-600 mb-6 animate-pulse">
          ระบบอยู่ระหว่างการปรับปรุง
        </h1>
        <p className="text-gray-700 text-lg mb-4 font-medium">
          ขออภัยในความไม่สะดวก ระบบกำลังอยู่ระหว่างการปรับปรุงเพื่อการให้บริการที่ดียิ่งขึ้น
        </p>
        <p className="text-gray-500 text-base">
          กรุณากลับมาใหม่ในภายหลัง
        </p>
      </div>
    </div>
  );
};

export default Maintenance;