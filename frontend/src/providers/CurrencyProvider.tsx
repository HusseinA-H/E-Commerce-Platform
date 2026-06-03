'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '../lib/api-client';
import { useTranslation } from './I18nProvider';

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'AED' | 'SAR' | 'EGP';
export type CountryCode = 'US' | 'GB' | 'AE' | 'SA' | 'EG' | 'FR' | 'DE' | string;

export interface Region {
  id: string;
  name: string;
  code: string;
  currencyCode: string;
  taxType: string;
  taxRate: number;
}

export interface Country {
  code: string;
  name: string;
  defaultCurrency: string;
  regionId: string;
}

interface CurrencyContextType {
  currency: CurrencyCode;
  country: CountryCode;
  rates: Record<string, number>;
  regions: Region[];
  countries: Country[];
  isLoading: boolean;
  setCurrency: (code: CurrencyCode) => void;
  setCountry: (code: CountryCode) => void;
  convert: (amount: number, from: string, to: string) => number;
  usdToActive: (amountInUSD: number) => number;
  formatPrice: (amount: number, customCurrency?: string) => string;
}

const DEFAULT_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  AED: 3.67,
  SAR: 3.75,
  EGP: 47.50,
};

const DEFAULT_REGIONS: Region[] = [
  { id: 'us-region', name: 'USA', code: 'US', currencyCode: 'USD', taxType: 'sales_tax', taxRate: 0.088 },
  { id: 'eu-region', name: 'Europe', code: 'EU', currencyCode: 'EUR', taxType: 'vat', taxRate: 0.19 },
  { id: 'uk-region', name: 'UK', code: 'GB', currencyCode: 'GBP', taxType: 'vat', taxRate: 0.20 },
  { id: 'ae-region', name: 'UAE', code: 'AE', currencyCode: 'AED', taxType: 'vat', taxRate: 0.05 },
  { id: 'sa-region', name: 'Saudi Arabia', code: 'SA', currencyCode: 'SAR', taxType: 'vat', taxRate: 0.15 },
  { id: 'eg-region', name: 'Egypt', code: 'EG', currencyCode: 'EGP', taxType: 'vat', taxRate: 0.14 },
];

const DEFAULT_COUNTRIES: Country[] = [
  { code: 'US', name: 'United States', defaultCurrency: 'USD', regionId: 'us-region' },
  { code: 'GB', name: 'United Kingdom', defaultCurrency: 'GBP', regionId: 'uk-region' },
  { code: 'AE', name: 'United Arab Emirates', defaultCurrency: 'AED', regionId: 'ae-region' },
  { code: 'SA', name: 'Saudi Arabia', defaultCurrency: 'SAR', regionId: 'sa-region' },
  { code: 'EG', name: 'Egypt', defaultCurrency: 'EGP', regionId: 'eg-region' },
  { code: 'FR', name: 'France', defaultCurrency: 'EUR', regionId: 'eu-region' },
  { code: 'DE', name: 'Germany', defaultCurrency: 'EUR', regionId: 'eu-region' },
];

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const { locale } = useTranslation();
  const [currency, setCurrencyState] = useState<CurrencyCode>('USD');
  const [country, setCountryState] = useState<CountryCode>('US');
  const [rates, setRates] = useState<Record<string, number>>(DEFAULT_RATES);
  const [regions, setRegions] = useState<Region[]>(DEFAULT_REGIONS);
  const [countries, setCountries] = useState<Country[]>(DEFAULT_COUNTRIES);
  const [isLoading, setIsLoading] = useState(true);

  // Load persistence and fetch backend rates/regions
  useEffect(() => {
    // 1. Recover from localStorage
    const savedCurrency = localStorage.getItem('apex-luxe-currency') as CurrencyCode;
    const savedCountry = localStorage.getItem('apex-luxe-country') as CountryCode;

    if (savedCurrency) setCurrencyState(savedCurrency);
    if (savedCountry) setCountryState(savedCountry);

    // 2. Fetch from backend APIs
    const fetchData = async () => {
      try {
        const [ratesRes, regionRes] = await Promise.all([
          apiClient.get('/currency/rates?base=USD'),
          apiClient.get('/region/list'),
        ]);

        if (ratesRes.data && typeof ratesRes.data === 'object') {
          // If rates are wrapped in key or standard record
          const resolvedRates = ratesRes.data.rates || ratesRes.data;
          setRates(prev => ({ ...prev, ...resolvedRates }));
        }

        if (regionRes.data) {
          if (regionRes.data.regions) setRegions(regionRes.data.regions);
          if (regionRes.data.countries) setCountries(regionRes.data.countries);
        }
      } catch (err) {
        console.warn('Could not load global commerce configuration from backend. Using default catalog values.', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const setCurrency = (code: CurrencyCode) => {
    setCurrencyState(code);
    localStorage.setItem('apex-luxe-currency', code);
  };

  const setCountry = (code: CountryCode) => {
    setCountryState(code);
    localStorage.setItem('apex-luxe-country', code);

    // Automatically check if we need to switch the currency matching this country
    const targetCountry = countries.find(c => c.code.toUpperCase() === code.toUpperCase());
    if (targetCountry && targetCountry.defaultCurrency) {
      setCurrency(targetCountry.defaultCurrency as CurrencyCode);
    }
  };

  const convert = (amount: number, from: string, to: string): number => {
    if (from === to) return amount;
    
    // Convert to base USD first
    const rateFrom = rates[from] || DEFAULT_RATES[from] || 1.0;
    const amountInUSD = amount / rateFrom;
    
    // Convert USD to target currency
    const rateTo = rates[to] || DEFAULT_RATES[to] || 1.0;
    return amountInUSD * rateTo;
  };

  const usdToActive = (amountInUSD: number): number => {
    return convert(amountInUSD, 'USD', currency);
  };

  const formatPrice = (amount: number, customCurrency?: string): string => {
    const activeCurrency = customCurrency || currency;
    const formattingLocale = locale === 'ar' ? 'ar-EG' : 'en-US';

    const formatter = new Intl.NumberFormat(formattingLocale, {
      style: 'currency',
      currency: activeCurrency,
      minimumFractionDigits: 2,
    });

    return formatter.format(amount);
  };

  const contextValue: CurrencyContextType = {
    currency,
    country,
    rates,
    regions,
    countries,
    isLoading,
    setCurrency,
    setCountry,
    convert,
    usdToActive,
    formatPrice,
  };

  return (
    <CurrencyContext.Provider value={contextValue}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
