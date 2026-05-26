import { useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { disconnectEcho, getEcho, realtimeConnection } from '../../realtime/echo';

const dispatchRealtime = (name, detail) => {
  window.dispatchEvent(new CustomEvent(`digibank:${name}`, { detail }));
};

const toastType = (notificationType) => {
  if (notificationType === 'warning') return 'error';
  if (notificationType === 'success') return 'success';
  return 'info';
};

const RealtimeListener = ({ addToast }) => {
  const { user, token, isAuthenticated } = useAuth();
  const addToastRef = useRef(addToast);

  useEffect(() => {
    addToastRef.current = addToast;
  }, [addToast]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id || !token) {
      disconnectEcho();
      return undefined;
    }

    let echo;
    let channel;
    let connection;
    const channelName = `user.${user.id}`;

    try {
      echo = getEcho();
      channel = echo.private(channelName);
      connection = realtimeConnection();
    } catch (error) {
      dispatchRealtime('connection-error', error);
      return undefined;
    }

    const onTransferCompleted = (payload) => {
      addToastRef.current?.(
        payload?.direction === 'incoming' ? 'Virement recu en temps reel.' : 'Virement envoye en temps reel.',
        'success'
      );
    };

    const onDepositCompleted = (payload) => {
      addToastRef.current?.('Recharge creditee en temps reel.', 'success');
    };

    const onDepositConfirmed = (payload) => {
      dispatchRealtime('deposit-confirmed', payload);
    };

    const onStripePaymentConfirmed = (payload) => {
      dispatchRealtime('stripe-payment-confirmed', payload);
    };

    const onTransactionCreated = (payload) => {
      dispatchRealtime('transaction-created', payload);
    };

    const onBalanceUpdated = (payload) => {
      dispatchRealtime('account-updated', payload);
    };

    const onNotificationCreated = (payload) => {
      dispatchRealtime('notification-created', payload);
      const notification = payload?.notification;
      if (notification?.title || notification?.message) {
        addToastRef.current?.(notification.title || notification.message, toastType(notification.type));
      }
    };

    const onStateChange = (states) => {
      dispatchRealtime('connection-state', states);
    };

    const onError = (error) => {
      dispatchRealtime('connection-error', error);
    };

    channel
      .listen('.transfer.completed', onTransferCompleted)
      .listen('.deposit.completed', onDepositCompleted)
      .listen('.deposit.confirmed', onDepositConfirmed)
      .listen('.stripe.payment.confirmed', onStripePaymentConfirmed)
      .listen('.transaction.created', onTransactionCreated)
      .listen('.balance.updated', onBalanceUpdated)
      .listen('.notification.created', onNotificationCreated);

    connection?.bind('state_change', onStateChange);
    connection?.bind('error', onError);

    return () => {
      channel
        .stopListening('.transfer.completed')
        .stopListening('.deposit.completed')
        .stopListening('.deposit.confirmed')
        .stopListening('.stripe.payment.confirmed')
        .stopListening('.transaction.created')
        .stopListening('.balance.updated')
        .stopListening('.notification.created');

      connection?.unbind('state_change', onStateChange);
      connection?.unbind('error', onError);
      echo?.leave(channelName);
      disconnectEcho();
    };
  }, [isAuthenticated, token, user?.id]);

  return null;
};

export default RealtimeListener;
