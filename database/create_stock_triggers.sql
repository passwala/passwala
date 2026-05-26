-- 1. Add non-negative constraint to prevent stock from going below zero
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stock_non_negative'
  ) THEN
    ALTER TABLE products ADD CONSTRAINT stock_non_negative CHECK (stock_quantity >= 0);
  END IF;
END $$;

-- 2. Function to decrement stock when an order_item is inserted
CREATE OR REPLACE FUNCTION decrement_stock_on_order()
RETURNS TRIGGER AS $$
BEGIN
  -- We only decrement if there's a valid product_id
  IF NEW.product_id IS NOT NULL THEN
    UPDATE products
    SET stock_quantity = stock_quantity - COALESCE(NEW.quantity, 1)
    WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger to fire the decrement function after INSERT on order_items
DROP TRIGGER IF EXISTS trigger_decrement_stock ON order_items;
CREATE TRIGGER trigger_decrement_stock
AFTER INSERT ON order_items
FOR EACH ROW
EXECUTE FUNCTION decrement_stock_on_order();

-- 4. Function to restore stock when an order is cancelled
CREATE OR REPLACE FUNCTION restore_stock_on_cancel()
RETURNS TRIGGER AS $$
DECLARE
  item RECORD;
BEGIN
  -- If order status changes to CANCELLED, we restore stock
  IF NEW.status = 'CANCELLED' AND OLD.status != 'CANCELLED' THEN
    FOR item IN SELECT product_id, quantity FROM order_items WHERE order_id = NEW.id LOOP
      IF item.product_id IS NOT NULL THEN
        UPDATE products
        SET stock_quantity = stock_quantity + COALESCE(item.quantity, 1)
        WHERE id = item.product_id;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger to fire the restore function after UPDATE on orders
DROP TRIGGER IF EXISTS trigger_restore_stock ON orders;
CREATE TRIGGER trigger_restore_stock
AFTER UPDATE OF status ON orders
FOR EACH ROW
EXECUTE FUNCTION restore_stock_on_cancel();
