
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Client, Product } from '../types';

interface DataContextType {
  clients: Client[];
  products: Product[];
  addClient: (client: Client) => void;
  updateClient: (id: string, client: Partial<Client>) => void;
  addProduct: (product: Product) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Initial Mock Data
const INITIAL_CLIENTS: Client[] = [
  { id: 'C1', name: 'Dr. Sarah Smith', hospital: 'City General Hospital', address: '45 Medical Park Rd, Bangalore\nKarnataka - 560038', gstin: '29ABCDE1234F1Z5', phone: '9876543210' },
  { id: 'C2', name: 'Mr. Rajesh Kumar', hospital: 'Apollo Clinic', address: 'Plot 12, Sector 5, Rohini, New Delhi - 110085', gstin: '07XXXYY1234A1Z9', phone: '9988776655' },
  { id: 'C3', name: 'Sree Meditec Demo', hospital: 'Sree Meditec HQ', address: 'No: 18, Bajanai Koil Street, Chennai - 600073', gstin: '33APGPS4675G2ZL', phone: '9884818398' },
];

const INITIAL_PRODUCTS: Product[] = [
  { 
      id: 'P-1', name: 'MRI Coil (Head)', category: 'Spare Part', sku: 'MRI-H-001', stock: 2, price: 15000, minLevel: 3, location: 'Shelf A1',
      model: 'Philips Achieva 1.5T', hsn: '9018', taxRate: 12, description: 'High signal-to-noise ratio\nCompatible with 1.5T systems'
  },
  { 
      id: 'P-2', name: 'Ultrasound Gel (5L)', category: 'Consumable', sku: 'USG-GEL-5L', stock: 150, price: 25, minLevel: 50, location: 'Warehouse B',
      model: 'EchoMax Standard', hsn: '3006', taxRate: 12, description: 'Hypoallergenic\nWater soluble\nNon-staining'
  },
  { 
      id: 'P-3', name: 'Patient Monitor X12', category: 'Equipment', sku: 'PM-X12', stock: 8, price: 1200, minLevel: 5, location: 'Showroom',
      model: 'PM-X12 Pro', hsn: '9018', taxRate: 18, description: '12-inch Touchscreen\nECG, SpO2, NIBP, Resp, Temp'
  },
  { 
      id: 'P-4', name: 'X-Ray Tube Housing', category: 'Spare Part', sku: 'XR-TB-99', stock: 1, price: 4500, minLevel: 2, location: 'Shelf C4',
      model: 'Varian Compatible', hsn: '9022', taxRate: 18, description: 'Heavy duty anode\n150kVp rated'
  }
];

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [clients, setClients] = useState<Client[]>(INITIAL_CLIENTS);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);

  const addClient = (client: Client) => {
    setClients(prev => [...prev, client]);
  };

  const updateClient = (id: string, updates: Partial<Client>) => {
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const addProduct = (product: Product) => {
    setProducts(prev => [...prev, product]);
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  return (
    <DataContext.Provider value={{ clients, products, addClient, updateClient, addProduct, updateProduct }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
