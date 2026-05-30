function toProductResponse(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    title: row.title || row.name,
    author: row.author,
    price: row.price,
    originalPrice: row.original_price,
    discount: row.discount,
    image: row.image,
    category: row.category_slug,
    categoryName: row.category_name,
    slug: row.slug,
    stock: row.stock,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toUserResponse(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toVoucherResponse(row) {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    description: row.description,
    discountType: row.discount_type,
    discountValue: row.discount_value,
    minOrder: row.min_order,
    active: Boolean(row.active),
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toOrderResponse(row) {
  return {
    id: row.id,
    customer: row.customer_name,
    customerName: row.customer_name,
    phone: row.customer_phone,
    email: row.customer_email,
    shippingAddress: row.shipping_address,
    paymentMethod: row.payment_method,
    status: row.status,
    total: row.total,
    date: String(row.created_at || '').slice(0, 10),
    createdAt: row.created_at
  };
}

function toOrderItemResponse(row) {
  return {
    id: row.id,
    orderId: row.order_id,
    productId: row.product_id,
    productName: row.product_name,
    name: row.product_name,
    price: row.price,
    originalPrice: row.original_price || row.price,
    quantity: row.quantity,
    subtotal: row.subtotal,
    author: row.author || 'MOT Manga',
    image: row.image || row.product_image || 'assets/images/placeholder-cover.svg',
    categoryName: row.category_name || 'Manga'
  };
}

module.exports = {
  toProductResponse,
  toUserResponse,
  toVoucherResponse,
  toOrderResponse,
  toOrderItemResponse
};
