import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, getErrorMessage } from '../lib/api-client';
import { useAuthStore } from '../store';
import { useToast } from '../providers/ToastProvider';
import { UserAccount } from '../types/index';

export function useCurrentUserQuery(enabled = true) {
  return useQuery<UserAccount>({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const response = await apiClient.get('/users/me');
      const user = response.data;
      
      // Sync into Zustand auth store for client interaction fallbacks
      useAuthStore.setState({ currentUser: user });
      return user;
    },
    enabled,
    retry: false, // Don't keep retrying if unauthorized
    staleTime: 1000 * 60 * 5, // 5 minutes — user profile rarely changes
  });
}

export function useLoginMutation() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (credentials: { email: string; passkey?: string }) => {
      // Backend LoginDto expects email and password
      const response = await apiClient.post('/auth/login', {
        email: credentials.email,
        password: credentials.passkey || 'Password123!', // fallback password for demo
      });
      return response.data;
    },
    onSuccess: (data) => {
      // Data contains { user, accessToken, refreshToken }
      useAuthStore.setState({ currentUser: data.user });
      queryClient.setQueryData(['currentUser'], data.user);
      
      // Invalidate queries to reload cart/wishlist/orders log from DB
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      
      showToast(`ACCESS GRANTED: WELCOME BACK, ${(data.user?.name || '').toUpperCase()}`, 'success');
    },
    onError: (error) => {
      showToast(getErrorMessage(error), 'error');
    },
  });
}

export function useRegisterMutation() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (userData: { name: string; email: string; passkey?: string }) => {
      const response = await apiClient.post('/auth/register', {
        name: userData.name,
        email: userData.email,
        password: userData.passkey || 'Password123!',
      });
      return response.data;
    },
    onSuccess: async (data, variables) => {
      showToast('ACCOUNT CREATED. PLEASE CHECK EMAIL TO VERIFY PROFILE.', 'success');
    },
    onError: (error) => {
      showToast(getErrorMessage(error), 'error');
    },
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async () => {
      // Backend AuthController.logout expects body RefreshTokenDto or read cookie
      await apiClient.post('/auth/logout', {});
    },
    onSuccess: () => {
      useAuthStore.setState({ currentUser: null });
      queryClient.setQueryData(['currentUser'], null);
      
      // Clear query cache
      queryClient.clear();
      
      showToast('SESSION TERMINATED. LOGGED OUT.', 'info');
    },
    onError: () => {
      // Force clean up local state anyway
      useAuthStore.setState({ currentUser: null });
      queryClient.setQueryData(['currentUser'], null);
      queryClient.clear();
      showToast('LOGGED OUT.', 'info');
    },
  });
}

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (data: { name: string }) => {
      const response = await apiClient.patch('/users/me', data);
      return response.data;
    },
    onSuccess: (updatedUser) => {
      useAuthStore.setState({ currentUser: updatedUser });
      queryClient.setQueryData(['currentUser'], updatedUser);
      showToast('PROFILE UPDATED SUCCESSFULLY', 'success');
    },
    onError: (error) => {
      showToast(getErrorMessage(error), 'error');
    },
  });
}
