import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');
    
    if (storagedCart) {
      return JSON.parse(storagedCart);
    }
    
    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      // Verifica se existe este produto já adicionado no carrinho
      const productIndex = cart.findIndex(product => product.id === productId);
      
      if(productIndex === -1){
        // Não localizou o produto no carrinho
        await api.get(`/products/${productId}`)
          .then(response => {
            if(response.status === 200){
              const newCart = [ ...cart, { ...response.data, amount: 1 } ];

              // Atualiza o carrinho
              setCart(newCart);
              
              // Atualiza o armazenamento local
              localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
            }else{
              toast.error('Erro na adição do produto');
            }
          });
      }else{
        // Atualiza a quantidade de produto
        await updateProductAmount({ productId: productId, amount: cart[productIndex].amount + 1 });
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      // Verifica se existe este produto já adicionado no carrinho
      const productIndex = cart.findIndex(product => product.id === productId);
      
      if(productIndex >= 0){
        const newCart = [
          ...cart.slice(0, productIndex), ...cart.slice(productIndex + 1)
        ]

        // Remove o produto e já define o novo carrinho
        setCart(newCart);

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      }else{
        // Produto não localizado, da uma mensagem de erro
        throw new Error('Erro na remoção do produto');
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      // Verifica se existe este produto já adicionado no carrinho
      const productIndex = cart.findIndex(product => product.id === productId);

      if(productIndex >= 0){
        // Verifica se esta tentando informar uma valor negativo
        if(amount <= 1){
          toast.error('Não é possível diminuir mais a quantidade deste produto');

        }else{
          // Carrega o produto e define sua nova quantidade
          const product = { ...cart[productIndex], amount: amount }

          let amountStock = 0;

          // Verifica se existe este produto no estoque
          await api.get(`/stock/${productId}`)
                    .then(response => amountStock = response.data.amount);

          if(amountStock < product.amount){
            toast.error('Quantidade solicitada fora de estoque');
          }else{
            const newCart = [
              ...cart.slice(0, productIndex), product, ...cart.slice(productIndex + 1)
            ];

            // Atualiza a lista de produtos
            setCart(newCart);

            localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
          }
        }
      }else{
        // Produto não localizado, da uma mensagem de erro
        toast.error('Erro na alteração de quantidade do produto');
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
