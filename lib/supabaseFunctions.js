const supabase = require("../utils/supabaseClient");

async function getPaypalData(getAll = false) {

    let query;
    query = supabase.from('paypals')
    .select('*')
    .limit(1)
    
    if(getAll == false){
        query = query.single()
    }
    
    const { data, error } = await query
      
  
    if (error) {
      console.error('Error fetching PayPal data:', error);
      return null;
    }
    return data;
  }

  async function updateOrder(orderUuid, { phone, name, email }) {
    if (!phone && !name && !email) {
      throw new Error('At least one of phone, name, or email must be provided');
    }

    const updateData = {};
    if (phone) updateData.phone = phone;
    if (name) updateData.name = name;
    if (email) updateData.email = email;

    const { data, error } = await supabase
      .from('orders')
      .upsert({ order_id: orderUuid, ...updateData }, { onConflict: 'order_id' })
      .select();

    if (error) {
      console.error('Error upserting order:', error);
      return null;
    }
    return data;
  }

  async function updateOrderStatus(orderUuid, status) {
    if (!status) {
      throw new Error('Status must be provided');
    }

    const { data, error } = await supabase
      .from('orders')
      .update({ status })
      .eq('order_id', orderUuid)
      .select();

    if (error) {
      console.error('Error updating order status:', error);
      return null;
    }
    return data;
  }

  async function updateOrderData(orderUuid, newData) {
    if (!newData || Object.keys(newData).length === 0) {
      throw new Error('At least one field must be provided');
    }

    // Fetch current data
    const { data: currentOrder, error: fetchError } = await supabase
      .from('orders')
      .select('data')
      .eq('order_id', orderUuid)
      .single();

    if (fetchError) {
      console.error('Error fetching order:', fetchError);
      return null;
    }

    // Merge new data with existing data
    const mergedData = { ...(currentOrder?.data || {}), ...newData };

    const { data, error } = await supabase
      .from('orders')
      .update({ data: mergedData })
      .eq('order_id', orderUuid)
      .select();

    if (error) {
      console.error('Error updating order data:', error);
      return null;
    }
    return data;
  }

  async function upsertOrderFailed(orderUuid, dataToUpdate,{ name, email, phone } = {}) {
    

    const updateData = {
      status: 'failed/collected',
      data: dataToUpdate
    };

    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;

    const { data, error } = await supabase
      .from('orders')
      .upsert({ order_id: orderUuid, ...updateData }, { onConflict: 'order_id' })
      .select();

    if (error) {
      console.error('Error upserting failed order:', error);
      return null;
    }
    return data;
  }

  module.exports = {getPaypalData, updateOrder, updateOrderData, updateOrderStatus,upsertOrderFailed};

  