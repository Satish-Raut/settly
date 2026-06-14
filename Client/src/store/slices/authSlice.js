import { createSlice } from '@reduxjs/toolkit';

const initialUsers = [
  { id: 1, username: 'Aisha', email: 'aisha@settly.com', avatar: 'A' },
  { id: 2, username: 'Rohan', email: 'rohan@settly.com', avatar: 'R' },
  { id: 3, username: 'Priya', email: 'priya@settly.com', avatar: 'P' },
  { id: 4, username: 'Meera', email: 'meera@settly.com', avatar: 'M' },
  { id: 5, username: 'Sam', email: 'sam@settly.com', avatar: 'S' },
  { id: 6, username: 'Dev', email: 'dev@settly.com', avatar: 'D' },
];

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    users: initialUsers,
    currentUser: initialUsers[0], // Defaults to Aisha for testing
    isAuthenticated: true,
    token: 'mock-jwt-token-aisha',
    error: null,
  },
  reducers: {
    login: (state, action) => {
      const { email, password } = action.payload;
      // Simple mock authenticator
      const user = state.users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (user) {
        state.currentUser = user;
        state.isAuthenticated = true;
        state.token = `mock-jwt-token-${user.username.toLowerCase()}`;
        state.error = null;
      } else {
        state.error = 'Invalid credentials';
      }
    },
    logout: (state) => {
      state.currentUser = null;
      state.isAuthenticated = false;
      state.token = null;
    },
    register: (state, action) => {
      const { username, email } = action.payload;
      const exists = state.users.some(u => u.email.toLowerCase() === email.toLowerCase());
      if (exists) {
        state.error = 'Email already registered';
        return;
      }
      const newUser = {
        id: state.users.length + 1,
        username,
        email,
        avatar: username.charAt(0).toUpperCase(),
      };
      state.users.push(newUser);
      state.currentUser = newUser;
      state.isAuthenticated = true;
      state.token = `mock-jwt-token-${username.toLowerCase()}`;
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    }
  }
});

export const { login, logout, register, clearError } = authSlice.actions;
export default authSlice.reducer;
