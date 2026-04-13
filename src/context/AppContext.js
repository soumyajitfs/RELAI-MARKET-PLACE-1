import React, { createContext, useContext, useReducer } from 'react';

// Initial state
const initialState = {
  // Navigation
  selectedVertical: 'Home',
  selectedModelFilter: 'All Models',
  sidebarOpen: true,
  
  // Toast
  toast: {
    show: false,
    message: ''
  },
  
  // Patient Collectability page state
  patientData: {
    accounts: [],
    rawAccounts: [],
    hasOutput: false,
    editEnabled: false,
    selectedFacs: [],
    isLoading: false,
    isInitialLoading: true,
    apiError: null
  }
};

// Action types
const actionTypes = {
  SET_VERTICAL: 'SET_VERTICAL',
  SET_MODEL_FILTER: 'SET_MODEL_FILTER',
  TOGGLE_SIDEBAR: 'TOGGLE_SIDEBAR',
  SHOW_TOAST: 'SHOW_TOAST',
  HIDE_TOAST: 'HIDE_TOAST',
  SET_ACCOUNTS: 'SET_ACCOUNTS',
  SET_RAW_ACCOUNTS: 'SET_RAW_ACCOUNTS',
  SET_HAS_OUTPUT: 'SET_HAS_OUTPUT',
  SET_EDIT_ENABLED: 'SET_EDIT_ENABLED',
  SET_SELECTED_FACS: 'SET_SELECTED_FACS',
  TOGGLE_FACS_SELECTION: 'TOGGLE_FACS_SELECTION',

  SET_LOADING: 'SET_LOADING',
  UPDATE_ACCOUNT: 'UPDATE_ACCOUNT',
  RESET_PATIENT_DATA: 'RESET_PATIENT_DATA',
  SET_INITIAL_LOADING: 'SET_INITIAL_LOADING',
  SET_API_ERROR: 'SET_API_ERROR'
};

// Reducer
const appReducer = (state, action) => {
  switch (action.type) {
    case actionTypes.SET_VERTICAL:
      return { ...state, selectedVertical: action.payload };
    
    case actionTypes.SET_MODEL_FILTER:
      return { ...state, selectedModelFilter: action.payload };
    
    case actionTypes.TOGGLE_SIDEBAR:
      return { ...state, sidebarOpen: !state.sidebarOpen };
    
    case actionTypes.SHOW_TOAST:
      return { ...state, toast: { show: true, message: action.payload.message || action.payload, type: action.payload.type || 'warning' } };
    
    case actionTypes.HIDE_TOAST:
      return { ...state, toast: { show: false, message: '', type: 'warning' } };
    
    case actionTypes.SET_ACCOUNTS:
      return {
        ...state,
        patientData: { ...state.patientData, accounts: action.payload }
      };
    
    case actionTypes.SET_RAW_ACCOUNTS:
      return {
        ...state,
        patientData: { ...state.patientData, rawAccounts: action.payload }
      };
    
    case actionTypes.SET_HAS_OUTPUT:
      return {
        ...state,
        patientData: { ...state.patientData, hasOutput: action.payload }
      };
    
    case actionTypes.SET_EDIT_ENABLED:
      return {
        ...state,
        patientData: { ...state.patientData, editEnabled: action.payload }
      };
    
    case actionTypes.SET_SELECTED_FACS:
      return {
        ...state,
        patientData: { ...state.patientData, selectedFacs: action.payload }
      };
    
    case actionTypes.TOGGLE_FACS_SELECTION:
      const { facsNumber } = action.payload;
      const currentSelection = state.patientData.selectedFacs;
      // Single-select only: clicking the same row deselects it; clicking a new row selects only that one
      const newSelection = currentSelection.includes(facsNumber)
        ? []
        : [facsNumber];
      return {
        ...state,
        patientData: { ...state.patientData, selectedFacs: newSelection }
      };
    
    case actionTypes.SET_LOADING:
      return {
        ...state,
        patientData: { ...state.patientData, isLoading: action.payload }
      };
    
    case actionTypes.UPDATE_ACCOUNT:
      const { facsNumber: updateFacs, updates } = action.payload;
      const updatedAccounts = state.patientData.accounts.map(acc =>
        acc.facsNumber === updateFacs ? { ...acc, ...updates } : acc
      );
      return {
        ...state,
        patientData: { ...state.patientData, accounts: updatedAccounts }
      };
    
    case actionTypes.RESET_PATIENT_DATA:
      return {
        ...state,
        patientData: {
          accounts: [],
          rawAccounts: [],
          hasOutput: false,
          editEnabled: false,
          selectedFacs: [],
          shapSelectedFacs: null,
          isLoading: false,
          isInitialLoading: true,
          apiError: null
        }
      };
    
    case actionTypes.SET_INITIAL_LOADING:
      return {
        ...state,
        patientData: { ...state.patientData, isInitialLoading: action.payload }
      };
    
    case actionTypes.SET_API_ERROR:
      return {
        ...state,
        patientData: { ...state.patientData, apiError: action.payload }
      };
    
    default:
      return state;
  }
};

// Create context
const AppContext = createContext();

// Provider component
export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Action creators
  const actions = {
    setVertical: (vertical) => dispatch({ type: actionTypes.SET_VERTICAL, payload: vertical }),
    setModelFilter: (filter) => dispatch({ type: actionTypes.SET_MODEL_FILTER, payload: filter }),
    toggleSidebar: () => dispatch({ type: actionTypes.TOGGLE_SIDEBAR }),
    showToast: (message) => dispatch({ type: actionTypes.SHOW_TOAST, payload: message }),
    hideToast: () => dispatch({ type: actionTypes.HIDE_TOAST }),
    setAccounts: (accounts) => dispatch({ type: actionTypes.SET_ACCOUNTS, payload: accounts }),
    setRawAccounts: (accounts) => dispatch({ type: actionTypes.SET_RAW_ACCOUNTS, payload: accounts }),
    setHasOutput: (hasOutput) => dispatch({ type: actionTypes.SET_HAS_OUTPUT, payload: hasOutput }),
    setEditEnabled: (enabled) => dispatch({ type: actionTypes.SET_EDIT_ENABLED, payload: enabled }),
    setSelectedFacs: (facs) => dispatch({ type: actionTypes.SET_SELECTED_FACS, payload: facs }),
    toggleFacsSelection: (facsNumber) => dispatch({ type: actionTypes.TOGGLE_FACS_SELECTION, payload: { facsNumber } }),

    setLoading: (loading) => dispatch({ type: actionTypes.SET_LOADING, payload: loading }),
    updateAccount: (facsNumber, updates) => dispatch({ type: actionTypes.UPDATE_ACCOUNT, payload: { facsNumber, updates } }),
    resetPatientData: () => dispatch({ type: actionTypes.RESET_PATIENT_DATA }),
    setInitialLoading: (loading) => dispatch({ type: actionTypes.SET_INITIAL_LOADING, payload: loading }),
    setApiError: (error) => dispatch({ type: actionTypes.SET_API_ERROR, payload: error })
  };

  return (
    <AppContext.Provider value={{ state, actions }}>
      {children}
    </AppContext.Provider>
  );
};

// Custom hook to use the context
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

export default AppContext;
