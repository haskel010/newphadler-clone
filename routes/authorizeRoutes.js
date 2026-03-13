
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const {
  APIContracts,
  APIControllers,
  Constants,
} = require('authorizenet');
const keys = require('../lib/keys');
const { updateOrderStatus } = require('../lib/supabaseFunctions');




const router = express.Router();

const config = keys.IS_SANDBOX ? keys.AUTHORIZE.SANDBOX : keys.AUTHORIZE.PRODUCTION;

if (!config.API_LOGIN_ID || !config.TRANSACTION_KEY || !config.PUBLIC_CLIENT_KEY) {
  console.warn('⚠️ [Authorize.Net] Missing API keys – check your .env');
}

/**
 * POST /authorize/create-authorize-payment
 * ----------------------------------------
 * Called from your EJS page via fetch() with:
 *   opaqueData, amount, patientId, uuid
 */
router.post('/create-authorize-payment', (req, res) => {
  const { opaqueData, amount, patientId, uuid } = req.body || {};

  if (!opaqueData || !opaqueData.dataDescriptor || !opaqueData.dataValue) {
    return res.status(400).json({
      success: false,
      message: 'Invalid payment data (opaqueData missing).',
    });
  }

  try {
    // Merchant auth
    const merchantAuthenticationType =
      new APIContracts.MerchantAuthenticationType();
    merchantAuthenticationType.setName(config.API_LOGIN_ID);
    merchantAuthenticationType.setTransactionKey(config.TRANSACTION_KEY);

    // Opaque data from Accept.js
    const opaqueDataType = new APIContracts.OpaqueDataType();
    opaqueDataType.setDataDescriptor(opaqueData.dataDescriptor);
    opaqueDataType.setDataValue(opaqueData.dataValue);

    const paymentType = new APIContracts.PaymentType();
    paymentType.setOpaqueData(opaqueDataType);

    // Transaction Request
    const transactionRequestType =
      new APIContracts.TransactionRequestType();
    transactionRequestType.setTransactionType(
      APIContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION
    );
    transactionRequestType.setAmount(parseFloat(amount || '0'));
    transactionRequestType.setPayment(paymentType);

    // Optional order info
   const order = new APIContracts.OrderType();
   const rawInvoice = (uuid || uuidv4()).replace(/-/g, '');
   const invoiceNumber = rawInvoice.substring(0, 20); // Authorize.Net limit
   order.setInvoiceNumber(invoiceNumber);
   order.setDescription(`Payment for customer`);
   transactionRequestType.setOrder(order);






    // Build createTransaction request
    const createRequest = new APIContracts.CreateTransactionRequest();
    createRequest.setMerchantAuthentication(merchantAuthenticationType);
    createRequest.setTransactionRequest(transactionRequestType);

    const ctrl = new APIControllers.CreateTransactionController(
      createRequest.getJSON()
    );

    // Environment: sandbox or production
    if (keys.IS_SANDBOX) {
      ctrl.setEnvironment(Constants.endpoint.sandbox);
    } else {
      ctrl.setEnvironment(Constants.endpoint.production);
    }

    ctrl.execute(() => {
      const apiResponse = ctrl.getResponse();

      if (!apiResponse) {
        return res.json({
          success: false,
          message: 'No response from payment gateway.',
        });
      }

      const response =
        new APIContracts.CreateTransactionResponse(apiResponse);

      const messages = response.getMessages();
      const trx = response.getTransactionResponse();

      // Success path
      if (
        messages &&
        messages.getResultCode() === APIContracts.MessageTypeEnum.OK &&
        trx &&
        trx.getResponseCode() === '1'
      ) {
        const transactionId = trx.getTransId();

        updateOrderStatus(uuid, 'completed/payment');

        // TODO: Save to DB if needed.
        return res.json({
          success: true,
          transactionId,
          authCode: trx.getAuthCode(),
          message: 'Payment successful',
        });
      }

      // Error handling
      let errorText = 'Payment failed';
      updateOrderStatus(uuid, 'failed/payment');

      if (trx && trx.getErrors() && trx.getErrors().getError()) {
        const err = trx.getErrors().getError()[0];
        errorText = `${err.getErrorCode()}: ${err.getErrorText()}`;
      } else if (messages && messages.getMessage()) {
        const m = messages.getMessage()[0];
        errorText = `${m.getCode()}: ${m.getText()}`;
      }

      return res.json({
        success: false,
        message: errorText,
      });
    });
  } catch (err) {
    console.error('[Authorize.Net] Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during payment.',
    });
  }
});



module.exports = router;
