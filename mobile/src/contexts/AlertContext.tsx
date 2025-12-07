import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CustomAlert, AlertType } from '../components/CustomAlert';
import { setAlertContext } from '../utils/alert';

interface AlertButton {
  text: string;
  onPress: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface AlertContextType {
  showAlert: (
    type: AlertType,
    title: string,
    message: string,
    buttons?: AlertButton[]
  ) => void;
  hideAlert: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [alert, setAlert] = useState<{
    visible: boolean;
    type: AlertType;
    title: string;
    message: string;
    buttons?: AlertButton[];
  }>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
  });

  const showAlert = useCallback(
    (type: AlertType, title: string, message: string, buttons?: AlertButton[]) => {
      setAlert({
        visible: true,
        type,
        title,
        message,
        buttons,
      });
    },
    []
  );

  const hideAlert = useCallback(() => {
    setAlert((prev) => ({ ...prev, visible: false }));
  }, []);

  // Set alert context for utility functions
  useEffect(() => {
    setAlertContext({ showAlert });
    return () => {
      setAlertContext(null);
    };
  }, [showAlert]);

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert }}>
      {children}
      <CustomAlert
        visible={alert.visible}
        type={alert.type}
        title={alert.title}
        message={alert.message}
        buttons={alert.buttons}
        onClose={hideAlert}
      />
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within AlertProvider');
  }
  return context;
};

