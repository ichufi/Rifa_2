import React, { useState, useEffect } from 'react';
import { 
  signInAnonymously, 
  onAuthStateChanged
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc,
  collection, 
  onSnapshot, 
  writeBatch 
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase';

const appId = 'app-chico-rifa';

export default function App() {
  // --- ESTADOS ---
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [numbers, setNumbers] = useState<Record<number, any>>({});
  const [filter, setFilter] = useState('all'); 
  const [selectedNumber, setSelectedNumber] = useState(null); 
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [pinInput, setPinInput] = useState('');

  // Configurações Gerais da Rifa (salvas e sincronizadas na nuvem)
  const [pixKey, setPixKey] = useState('453.499.178-97');
  const [pixName, setPixName] = useState('Diogo Pereira de Farias');
  const [pixBank, setPixBank] = useState('C6 Bank');
  const [ticketPrice, setTicketPrice] = useState(30.00);
  const [causeDescription, setCauseDescription] = useState('O Chico perdeu 12kg e está enfrentando uma batalha pesada de saúde. Todo o valor desta rifa é para a sua cirurgia e exames.');
  const [adminPin, setAdminPin] = useState('1234');
  const [totalTickets, setTotalTickets] = useState(200);
  const [campaignTitle, setCampaignTitle] = useState('RIFA DO CHICO');
  const [campaignSubtitle, setCampaignSubtitle] = useState('Ajudando o nosso guerreiro no tratamento de saúde');
  const [prizeDescription, setPrizeDescription] = useState('BOLA OFICIAL DA COPA 2026 ou CAMISA OFICIAL DA SELEÇÃO + ÁLBUM PET PERSONALIZADO.');
  const [causeTitle, setCauseTitle] = useState('Nosso Guerreiro Chico precisa de nós!');
  const [campaignImage, setCampaignImage] = useState('');
  const [themeBg, setThemeBg] = useState('#f7f2eb');
  const [themePrimary, setThemePrimary] = useState('#bfa36f');
  const [themeSecondary, setThemeSecondary] = useState('#4a2e1b');

  // Estados temporários do formulário de administração
  const [tempPixKey, setTempPixKey] = useState('');
  const [tempPixName, setTempPixName] = useState('');
  const [tempPixBank, setTempPixBank] = useState('');
  const [tempTicketPrice, setTempTicketPrice] = useState(30.00);
  const [tempCauseDescription, setTempCauseDescription] = useState('');
  const [tempAdminPin, setTempAdminPin] = useState('1234');
  const [tempTotalTickets, setTempTotalTickets] = useState(200);
  const [tempCampaignTitle, setTempCampaignTitle] = useState('RIFA DO CHICO');
  const [tempCampaignSubtitle, setTempCampaignSubtitle] = useState('Ajudando o nosso guerreiro no tratamento de saúde');
  const [tempPrizeDescription, setTempPrizeDescription] = useState('BOLA OFICIAL DA COPA 2026 ou CAMISA OFICIAL DA SELEÇÃO + ÁLBUM PET PERSONALIZADO.');
  const [tempCauseTitle, setTempCauseTitle] = useState('Nosso Guerreiro Chico precisa de nós!');
  const [tempCampaignImage, setTempCampaignImage] = useState('');
  const [tempThemeBg, setTempThemeBg] = useState('#f7f2eb');
  const [tempThemePrimary, setTempThemePrimary] = useState('#bfa36f');
  const [tempThemeSecondary, setTempThemeSecondary] = useState('#4a2e1b');

  const [showAdminModal, setShowAdminModal] = useState(false);

  // Sincroniza os temporários sempre que abre o modal
  useEffect(() => {
    if (showAdminModal) {
      setTempPixKey(pixKey);
      setTempPixName(pixName);
      setTempPixBank(pixBank);
      setTempTicketPrice(ticketPrice);
      setTempCauseDescription(causeDescription);
      setTempAdminPin(adminPin);
      setTempTotalTickets(totalTickets);
      setTempCampaignTitle(campaignTitle);
      setTempCampaignSubtitle(campaignSubtitle);
      setTempPrizeDescription(prizeDescription);
      setTempCauseTitle(causeTitle);
      setTempCampaignImage(campaignImage);
      setTempThemeBg(themeBg);
      setTempThemePrimary(themePrimary);
      setTempThemeSecondary(themeSecondary);
    }
  }, [showAdminModal, pixKey, pixName, pixBank, ticketPrice, causeDescription, adminPin, totalTickets, campaignTitle, campaignSubtitle, prizeDescription, causeTitle, campaignImage, themeBg, themePrimary, themeSecondary]);

  // Formulário do Comprador Comum
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');

  // Formulário de Edição Direta do Admin (Preenchido ao clicar no número)
  const [adminEditName, setAdminEditName] = useState('');
  const [adminEditPhone, setAdminEditPhone] = useState('');
  const [adminEditStatus, setAdminEditStatus] = useState('available');

  // Notificações em Toast
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Exibir mensagens rápidas
  const showNotification = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  // --- EFEITO 1: AUTENTICAÇÃO SEGURA ANÔNIMA ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.log("Autenticação anônima desabilitada no Firebase Console. Continuando em modo público/visitante.", err instanceof Error ? err.message : String(err));
      }
    };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, async (usr) => {
      setUser(usr);
      // Sempre inicia a tela inicial Deslogada de admin conforme o pedido do usuário
    });
    return () => unsubscribe();
  }, [db]);

  // --- EFEITO 2: SINCRONIZAÇÃO DAS CONFIGURAÇÕES DA RIFA ---
  useEffect(() => {
    if (!db) return;

    const configRef = doc(db, 'artifacts', appId, 'public', 'data', 'config', 'settings');
    const unsubscribe = onSnapshot(configRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.pixKey) setPixKey(data.pixKey);
        if (data.pixName) setPixName(data.pixName);
        if (data.pixBank) setPixBank(data.pixBank);
        if (data.ticketPrice) setTicketPrice(parseFloat(data.ticketPrice));
        if (data.causeDescription) setCauseDescription(data.causeDescription);
        if (data.adminPin) setAdminPin(data.adminPin);
        if (data.totalTickets) setTotalTickets(parseInt(data.totalTickets) || 200);
        if (data.campaignTitle) setCampaignTitle(data.campaignTitle);
        if (data.campaignSubtitle) setCampaignSubtitle(data.campaignSubtitle);
        if (data.prizeDescription !== undefined) setPrizeDescription(data.prizeDescription);
        if (data.causeTitle !== undefined) setCauseTitle(data.causeTitle);
        if (data.campaignImage !== undefined) setCampaignImage(data.campaignImage);
        if (data.themeBg !== undefined) setThemeBg(data.themeBg || '#f7f2eb');
        if (data.themePrimary !== undefined) setThemePrimary(data.themePrimary || '#bfa36f');
        if (data.themeSecondary !== undefined) setThemeSecondary(data.themeSecondary || '#4a2e1b');
      } else {
        // Criação inicial das configurações com base no cartaz do Chico
        setDoc(configRef, {
          pixKey: '453.499.178-97',
          pixName: 'Diogo Pereira de Farias',
          pixBank: 'C6 Bank',
          ticketPrice: 30.00,
          causeDescription: 'O Chico perdeu 12kg e está enfrentando uma batalha pesada de saúde. Todo o valor desta rifa é para a sua cirurgia e exames.',
          adminPin: '1234',
          totalTickets: 200,
          campaignTitle: 'RIFA DO CHICO',
          campaignSubtitle: 'Ajudando o nosso guerreiro no tratamento de saúde',
          prizeDescription: 'BOLA OFICIAL DA COPA 2026 ou CAMISA OFICIAL DA SELEÇÃO + ÁLBUM PET PERSONALIZADO.',
          causeTitle: 'Nosso Guerreiro Chico precisa de nós!',
          campaignImage: '',
          themeBg: '#f7f2eb',
          themePrimary: '#bfa36f',
          themeSecondary: '#4a2e1b'
        }).catch(err => handleFirestoreError(err, OperationType.WRITE, configRef.path));
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, configRef.path);
    });

    return () => unsubscribe();
  }, [db]);

  // --- EFEITO 3: SINCRONIZAÇÃO EM TEMPO REAL DOS NÚMEROS ---
  useEffect(() => {
    if (!db) return;

    const ticketsCol = collection(db, 'artifacts', appId, 'public', 'data', 'tickets');
    const unsubscribe = onSnapshot(ticketsCol, (snapshot) => {
      const serverData = {};
      snapshot.forEach((doc) => {
        serverData[doc.id] = doc.data();
      });

      // Reconstrói a lista garantindo todos os slots preenchidos
      const completeList = {};
      for (let i = 1; i <= totalTickets; i++) {
        completeList[i] = serverData[i] || {
          number: i,
          status: 'available',
          name: '',
          phone: '',
          createdAt: null
        };
      }

      setNumbers(completeList);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, ticketsCol.path);
    });

    return () => unsubscribe();
  }, [db, totalTickets]);

  // --- EFEITO 4: INICIALIZAÇÃO LOCAL (SEM FIREBASE) ---
  useEffect(() => {
    if (db) return; // Se tem Firebase, não executa isso
    const completeList = {};
    for (let i = 1; i <= totalTickets; i++) {
      completeList[i] = {
        number: i,
        status: 'available',
        name: '',
        phone: '',
        createdAt: null
      };
    }
    setNumbers(completeList);
  }, [totalTickets]);

  // --- PREENCHE OS CAMPOS DE EDIÇÃO QUANDO O ADM CLICA ---
  useEffect(() => {
    if (selectedNumber && numbers[selectedNumber]) {
      const item = numbers[selectedNumber];
      setAdminEditName(item.name || '');
      setAdminEditPhone(item.phone || '');
      setAdminEditStatus(item.status || 'available');
    }
  }, [selectedNumber, numbers]);

  // --- ATUALIZAR CONFIGURAÇÕES ---
  const saveRemoteConfig = async (
    newKey: string,
    newName: string,
    newBank: string,
    newPrice: number,
    newDesc: string,
    newPin: string,
    newTotalTickets: number,
    newCampaignTitle: string,
    newCampaignSubtitle: string,
    newPrizeDesc: string,
    newCauseTitleVal: string,
    newCampaignImg: string,
    newThemeBg: string,
    newThemePrimary: string,
    newThemeSecondary: string
  ) => {
    setPixKey(newKey);
    setPixName(newName);
    setPixBank(newBank);
    setTicketPrice(newPrice);
    setCauseDescription(newDesc);
    setAdminPin(newPin);
    setTotalTickets(newTotalTickets);
    setCampaignTitle(newCampaignTitle);
    setCampaignSubtitle(newCampaignSubtitle);
    setPrizeDescription(newPrizeDesc);
    setCauseTitle(newCauseTitleVal);
    setCampaignImage(newCampaignImg);
    setThemeBg(newThemeBg);
    setThemePrimary(newThemePrimary);
    setThemeSecondary(newThemeSecondary);

    if (!db) return;

    try {
      const configRef = doc(db, 'artifacts', appId, 'public', 'data', 'config', 'settings');
      await setDoc(configRef, {
        pixKey: newKey,
        pixName: newName,
        pixBank: newBank,
        ticketPrice: newPrice,
        causeDescription: newDesc,
        adminPin: newPin,
        totalTickets: newTotalTickets,
        campaignTitle: newCampaignTitle,
        campaignSubtitle: newCampaignSubtitle,
        prizeDescription: newPrizeDesc,
        causeTitle: newCauseTitleVal,
        campaignImage: newCampaignImg,
        themeBg: newThemeBg,
        themePrimary: newThemePrimary,
        themeSecondary: newThemeSecondary
      }, { merge: true });
      showNotification("Configurações atualizadas com sucesso!");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, doc(db, 'artifacts', appId, 'public', 'data', 'config', 'settings').path);
    }
  };

  const handleSaveConfig = async () => {
    await saveRemoteConfig(
      tempPixKey,
      tempPixName,
      tempPixBank,
      tempTicketPrice,
      tempCauseDescription,
      tempAdminPin,
      tempTotalTickets,
      tempCampaignTitle,
      tempCampaignSubtitle,
      tempPrizeDescription,
      tempCauseTitle,
      tempCampaignImage,
      tempThemeBg,
      tempThemePrimary,
      tempThemeSecondary
    );
    setShowAdminModal(false);
  };

  const handleImageFileChange = (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showNotification('Por favor, selecione um arquivo de imagem válido.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 320;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.75);
          setTempCampaignImage(compressedBase64);
          showNotification('Imagem carregada! Não esqueça de Salvar as alterações abaixo.');
        } else {
          setTempCampaignImage(event.target?.result as string);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleDirectImageUpload = (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showNotification('Por favor, selecione um arquivo de imagem válido.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 320;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.75);
          setCampaignImage(compressedBase64);
          if (db) {
            const configRef = doc(db, 'artifacts', appId, 'public', 'data', 'config', 'settings');
            try {
              await setDoc(configRef, { campaignImage: compressedBase64 }, { merge: true });
              showNotification('Foto do Chico atualizada com sucesso!');
            } catch (err) {
              handleFirestoreError(err, OperationType.WRITE, configRef.path);
            }
          } else {
            showNotification('Foto do Chico atualizada localmente.');
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // --- AUXILIAR DE COPIAR PIX ---
  const handleCopyPix = () => {
    const tempInput = document.createElement('textarea');
    tempInput.value = pixKey;
    document.body.appendChild(tempInput);
    tempInput.select();
    try {
      document.execCommand('copy');
      showNotification('PIX copiado! Cole no app do seu banco para pagar.');
    } catch (err) {
      showNotification('Não foi possível copiar automaticamente.', 'error');
    }
    document.body.removeChild(tempInput);
  };

  // --- COMPARTILHAR LINK DO APP ---
  const handleShareLink = () => {
    const shareUrl = window.location.href;
    const tempInput = document.createElement('textarea');
    tempInput.value = shareUrl;
    document.body.appendChild(tempInput);
    tempInput.select();
    try {
      document.execCommand('copy');
      showNotification('Link da Rifa copiado!');
    } catch (err) {
      showNotification('Erro ao copiar link.', 'error');
    }
    document.body.removeChild(tempInput);
  };

  // --- RESERVA DO COMPRADOR COMUM ---
  const handleReserve = async (e) => {
    e.preventDefault();
    if (!buyerName.trim()) {
      showNotification('Preencha seu nome completo para a reserva.', 'error');
      return;
    }

    if (!db) return;

    try {
      const ticketRef = doc(db, 'artifacts', appId, 'public', 'data', 'tickets', String(selectedNumber));
      
      // Proteção de concorrência local rápida
      if (numbers[selectedNumber] && numbers[selectedNumber].status !== 'available') {
        showNotification('Esse número já foi escolhido por outra pessoa!', 'error');
        setSelectedNumber(null);
        return;
      }

      await setDoc(ticketRef, {
        number: selectedNumber,
        status: 'pending', // Deixa em pendente de aprovação
        name: buyerName,
        phone: buyerPhone,
        createdAt: new Date().toISOString()
      });

      showNotification(`Número ${selectedNumber} reservado! Aguardando validação.`);
      setSelectedNumber(null);
      setBuyerName('');
      setBuyerPhone('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, doc(db, 'artifacts', appId, 'public', 'data', 'tickets', String(selectedNumber)).path);
    }
  };

  // --- SALVAR EDIÇÃO DIRETA DO ADM (CLICOU NO NÚMERO) ---
  const handleAdminSaveSingle = async (e) => {
    e.preventDefault();
    if (!selectedNumber || !db) return;

    try {
      const ticketRef = doc(db, 'artifacts', appId, 'public', 'data', 'tickets', String(selectedNumber));
      
      if (adminEditStatus === 'available') {
        await setDoc(ticketRef, {
          number: selectedNumber,
          status: 'available',
          name: '',
          phone: '',
          createdAt: null
        });
      } else {
        await setDoc(ticketRef, {
          number: selectedNumber,
          status: adminEditStatus,
          name: adminEditName,
          phone: adminEditPhone,
          createdAt: new Date().toISOString()
        });
      }

      showNotification(`Número ${selectedNumber} atualizado pelo administrador!`);
      setSelectedNumber(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, doc(db, 'artifacts', appId, 'public', 'data', 'tickets', String(selectedNumber)).path);
    }
  };

  // --- REMOVER/LIBERAR NÚMERO COM UM TOQUE (ADMIN) ---
  const handleAdminQuickRelease = async () => {
    if (!selectedNumber || !db) return;

    try {
      const ticketRef = doc(db, 'artifacts', appId, 'public', 'data', 'tickets', String(selectedNumber));
      await setDoc(ticketRef, {
        number: selectedNumber,
        status: 'available',
        name: '',
        phone: '',
        createdAt: null
      });
      showNotification(`Número ${selectedNumber} foi limpo e liberado!`, 'info');
      setSelectedNumber(null);
    } catch (err) {
       handleFirestoreError(err, OperationType.WRITE, doc(db, 'artifacts', appId, 'public', 'data', 'tickets', String(selectedNumber)).path);
    }
  };

  // --- LOGIN DO ADMINISTRADOR ---
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    if (pinInput === adminPin) {
      setIsAdmin(true);
      setShowAdminLogin(false);

      if (db && auth.currentUser) {
        try {
          const adminRef = doc(db, 'admins', auth.currentUser.uid);
          await setDoc(adminRef, {
            uid: auth.currentUser.uid,
            authorizedAt: new Date().toISOString(),
            pin: pinInput
          });
        } catch (err) {
          console.warn("Erro ao sincronizar privilégios de Admin com o Firestore:", err);
        }
      }

      setPinInput('');
      setShowAdminModal(true); // Abre o painel administrativo como primeiro modal imediatamente
      showNotification('Painel de Administrador ativado com sucesso!');
    } else {
      showNotification('PIN incorreto.', 'error');
    }
  };



  // --- RESETAR TODA A RIFA DO CHICO ---
  const handleResetAll = async () => {
    const confirmReset = window.confirm(`🚨 ALERTA: Você tem certeza que quer APAGAR todos os compradores e limpar a Rifa do Chico por completo (de 1 até ${totalTickets})?`);
    if (!confirmReset || !db) return;

    try {
      // Execute em chunks de 450 para respeitar limites da transação batched do Firestore
      const chunks: number[] = [];
      for (let i = 1; i <= totalTickets; i++) {
        chunks.push(i);
      }

      const chunkSize = 450;
      for (let offset = 0; offset < chunks.length; offset += chunkSize) {
        const batch = writeBatch(db);
        const currentChunk = chunks.slice(offset, offset + chunkSize);
        for (const num of currentChunk) {
          const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'tickets', String(num));
          batch.set(docRef, {
            number: num,
            status: 'available',
            name: '',
            phone: '',
            createdAt: null
          });
        }
        await batch.commit();
      }

      showNotification('Rifa redefinida para o estado inicial.', 'info');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'artifacts/app-chico-rifa/public/data/tickets');
    }
  };

  // --- CÁLCULO DE ESTATÍSTICAS ---
  const stats: any = Object.values(numbers).reduce((acc: any, curr: any) => {
    acc[curr.status] += 1;
    return acc;
  }, { available: 0, pending: 0, approved: 0 });

  const progressPercent = Math.round(((stats.approved + stats.pending) / totalTickets) * 100) || 0;
  const totalArrecadado = stats.approved * ticketPrice;
  const totalPendente = stats.pending * ticketPrice;

  // --- TELA DE CARREGAMENTO ---
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f2eb] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-[#4a2e1b] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[#4a2e1b] font-bold text-sm tracking-wider animate-pulse">Sincronizando com a Nuvem...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f2eb] text-[#3d2314] font-sans antialiased select-none flex flex-col">
      
      {/* ESTILO DINÂMICO PARA TEMA PERSONALIZÁVEL */}
      <style>{`
        /* Sobrescrita dinâmica de cores baseada nas configurações do organizador */
        body {
          background-color: ${themeBg} !important;
        }
        
        .dynamic-theme-bg {
          background-color: ${themeBg} !important;
        }
        
        /* Destaques (Tags, Botões Principais) */
        .dynamic-theme-primary-bg {
          background-color: ${themePrimary} !important;
        }
        
        /* Cabeçalho, Rodapés, Elementos Principais do App */
        .dynamic-theme-secondary-bg {
          background-color: ${themeSecondary} !important;
        }
        
        /* Substituição automática de cores antigas do Chico pelo tema */
        [class*="bg-[#f7f2eb]"] {
          background-color: ${themeBg} !important;
        }
        [class*="bg-[#4a2e1b]"] {
          background-color: ${themeSecondary} !important;
        }
        [class*="text-[#4a2e1b]"] {
          color: ${themeSecondary} !important;
        }
        [class*="border-[#4a2e1b]"] {
          border-color: ${themeSecondary} !important;
        }
        [class*="bg-[#bfa36f]"] {
          background-color: ${themePrimary} !important;
        }
        [class*="text-[#bfa36f]"] {
          color: ${themePrimary} !important;
        }
        [class*="border-[#bfa36f]"] {
          border-color: ${themePrimary} !important;
        }
        [class*="hover:bg-[#d4b987]"]:hover {
          background-color: ${themePrimary}e6 !important;
        }
        [class*="hover:text-[#4a2e1b]"]:hover {
          color: ${themeSecondary} !important;
        }
        [class*="hover:border-[#4a2e1b]"]:hover {
          border-color: ${themeSecondary} !important;
        }
        [class*="hover:bg-[#593923]"]:hover {
          background-color: ${themeSecondary}f0 !important;
        }
        [class*="bg-[#4a2e1b]/5"] {
          background-color: ${themeSecondary}0d !important;
        }
        [class*="text-[#ebdcc5]"] {
          color: ${themeBg}ee !important;
        }
        [class*="text-[#fcedc0]"] {
          color: ${themePrimary} !important;
        }
        [class*="border-[#ebdcc5]"] {
          border-color: ${themePrimary}33 !important;
        }
        [class*="bg-[#fcf9f5]"] {
          background-color: ${themeBg}22 !important;
        }
        [class*="border-[#ebdcc5]/30"] {
          border-color: ${themeBg}44 !important;
        }
      `}</style>
      
      {/* ALERTA FLUTUANTE (TOAST) */}
      {toast.show && (
        <div className="fixed top-5 right-5 z-55 flex items-center p-4 rounded-xl shadow-xl transition-all border text-white bg-[#54341f] border-[#70482e] max-w-xs sm:max-w-md">
          <span className="text-xs sm:text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      {/* BANNER DO MODO ORGANIZADOR SE ATIVO */}
      {isAdmin && (
        <div className="bg-[#bfa36f] text-[#4a2e1b] text-xs font-bold py-3 px-4 sm:px-8 border-b-4 border-[#ebdcc5] flex flex-col md:flex-row items-center justify-between dynamic-admin-banner shrink-0 shadow-md gap-3">
          <div className="flex items-center gap-2 text-center md:text-left">
            <span>🛠️</span>
            <span><strong>Modo Organizador Ativo:</strong> Você pode clicar nos números para editar o comprador diretamente e gerenciar reservas.</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => setShowAdminModal(true)}
              className="bg-[#4a2e1b] text-white hover:bg-[#5f3b23] transition text-[10px] font-black px-3.5 py-1.5 rounded-lg shadow-md active:scale-95"
            >
              ⚙️ CONFIGURAÇÕES (MODAL)
            </button>
            <button
              onClick={handleResetAll}
              className="bg-red-800 text-white hover:bg-red-700 transition text-[10px] font-bold px-3 py-1.5 rounded-lg active:scale-95"
            >
              🚨 ZERAR TODA A RIFA
            </button>
            <button
              onClick={() => setIsAdmin(false)}
              className="bg-white/40 hover:bg-white/60 text-[#4a2e1b] transition text-[10px] font-black px-3 py-1.5 rounded-lg active:scale-95"
            >
              🔒 DESATIVAR PAINEL
            </button>
          </div>
        </div>
      )}

      {/* CABEÇALHO */}
      <header className="bg-[#4a2e1b] text-[#f7f2eb] py-4 px-4 sm:px-8 shadow-lg border-b-4 border-[#bfa36f] flex flex-col sm:flex-row justify-between items-center shrink-0 z-10 gap-3 sm:gap-0">
        <div className="flex flex-col text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
            <span 
              onClick={() => (isAdmin ? setShowAdminModal(true) : setShowAdminLogin(true))}
              className="bg-[#bfa36f] hover:bg-[#d4b987] text-[#4a2e1b] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter cursor-pointer select-none transition"
              title="Acesso Administrativo"
            >
              🐾 Campanha Solidária
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-[#fcedc0] leading-none mb-1 uppercase">
            {campaignTitle}
          </h1>
          <p className="text-xs font-medium text-[#d9c49c] italic opacity-85">
            {campaignSubtitle}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex flex-col items-center sm:items-end justify-center">
            <span className="text-[10px] uppercase font-bold text-[#bfa36f] opacity-70">Arrecadado</span>
            <span className="text-xl font-black text-white">R$ {totalArrecadado.toFixed(2)}</span>
          </div>
          {!isAdmin && (
            <button
              onClick={() => setShowAdminLogin(true)}
              className="bg-transparent hover:bg-white/10 active:scale-95 text-[#ebdcc5] hover:text-white border border-[#ebdcc5]/30 hover:border-[#ebdcc5]/60 text-xs font-bold px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 focus:outline-none"
            >
              🔑 Acesso Organizador
            </button>
          )}
        </div>
      </header>

      {/* BODY PRINCIPAL DIVIDIDO */}
      <main className="flex flex-col flex-1 p-4 sm:p-6 gap-6 sm:gap-8 bg-gradient-to-b from-white/10 to-transparent max-w-5xl mx-auto w-full">
        
        {/* 1. CAUSA EM CIMA (Meta Solidária) */}
        <div className="bg-white rounded-[24px] p-5 sm:p-8 border border-[#e6dcce] shadow-sm flex flex-col md:flex-row gap-6 items-center shrink-0">
          <div className="relative group w-16 h-16 sm:w-20 sm:h-20 bg-[#fcede0] rounded-2xl flex items-center justify-center shrink-0 overflow-hidden border border-[#f0e6d7]">
            {campaignImage ? (
              <img src={campaignImage} alt="Chico" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <span className="text-3xl sm:text-4xl">🐕</span>
            )}
            {isAdmin && (
              <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-center p-1 cursor-pointer select-none">
                <span className="text-xs">📸</span>
                <span className="text-[8px] text-white font-extrabold uppercase tracking-wider leading-none mt-1">Alterar</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleDirectImageUpload(e.target.files[0]);
                    }
                  }} 
                />
              </label>
            )}
          </div>
          <div className="flex-1 space-y-3 w-full">
            <div>
              <h3 className="text-lg sm:text-xl font-black text-[#4a2e1b] leading-tight flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                {causeTitle || "Nosso Guerreiro Chico precisa de nós!"}
                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-md inline-block w-max">Meta Solidária</span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 whitespace-pre-line">{causeDescription}</p>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] sm:text-xs font-bold text-[#4a2e1b]">
                <span>Progresso da Arrecadação</span>
                <span>{progressPercent}% Reservado</span>
              </div>
              <div className="w-full h-3 bg-[#f5f0e8] rounded-full overflow-hidden border border-[#e6dcce]">
                <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-700 transition-all duration-700" style={{ width: `${progressPercent}%` }}></div>
              </div>
            </div>
            <div className="bg-[#fcf9f5] border border-[#f0e6d7] p-3 rounded-xl text-[10px] sm:text-xs text-[#6e5648] leading-relaxed">
              <strong className="text-[#4a2e1b] uppercase">🎁 Premiação da Campanha:</strong> {prizeDescription || "BOLA OFICIAL DA COPA 2026 ou CAMISA OFICIAL DA SELEÇÃO + ÁLBUM PET PERSONALIZADO."}
            </div>
          </div>
        </div>

        {/* 2. PREÇO E PIX NO MEIO */}
        <div className="bg-[#fcede0] border border-[#e8d2bd] p-5 sm:p-8 rounded-[24px] shadow-sm flex flex-col md:flex-row gap-6 md:gap-10 items-center shrink-0">
          <div className="flex-1 grid grid-cols-2 gap-3 w-full text-center">
            <div className="bg-white/60 rounded-xl p-3 sm:p-4 border border-[#d9c49c]">
              <span className="text-[10px] sm:text-xs uppercase font-bold text-[#8a5d3b] block mb-1">Preço do Número</span>
              <span className="text-xl sm:text-3xl font-black text-[#4a2e1b]">R$ {ticketPrice.toFixed(2)}</span>
            </div>
            <div className="bg-white/60 rounded-xl p-3 sm:p-4 border border-[#d9c49c]">
              <span className="text-[10px] sm:text-xs uppercase font-bold text-[#8a5d3b] block mb-1">Total Confirmado</span>
              <span className="text-xl sm:text-3xl font-black text-emerald-700">R$ {totalArrecadado.toFixed(2)}</span>
            </div>
          </div>
          
          <div className="flex-1 w-full bg-white border border-[#d9c49c] rounded-2xl p-4 sm:p-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#8a5d3b]"></div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] sm:text-xs uppercase font-bold text-slate-400">Chave PIX Oficial</span>
              <button 
                onClick={handleCopyPix} 
                className="text-[10px] sm:text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-md uppercase hover:bg-emerald-100 transition border border-emerald-100 flex items-center gap-1 active:scale-95"
              >
                <span>📋</span> Copiar
              </button>
            </div>
            <p className="font-mono text-sm sm:text-base font-black text-[#4a2e1b] truncate mb-3 select-all" title={pixKey}>{pixKey}</p>
            <div className="pt-3 border-t border-slate-100 text-[10px] sm:text-xs text-[#6e5648] flex flex-col gap-1">
              <p>Beneficiário: <strong className="text-[#4a2e1b]">{pixName}</strong></p>
              <p>Banco: <strong className="text-[#4a2e1b]">{pixBank}</strong></p>
            </div>
          </div>
        </div>

        {/* 3. NÚMEROS (FILTROS E GRID) EMBAIXO */}
        <section className="flex flex-col gap-4">
          
          <div className="text-center sm:text-left mb-1 px-2">
            <h2 className="text-[#4a2e1b] font-black text-xl sm:text-2xl">Escolha seus números da sorte abaixo 👇</h2>
            <p className="text-xs text-slate-500 mt-1">Toque no número desejado para reservar.</p>
          </div>

          {/* FILTROS */}
          <div className="flex flex-col sm:flex-row items-center justify-between bg-white/50 p-2 sm:p-3 rounded-2xl border border-[#e6dcce] gap-3">
            <div className="flex gap-2 sm:gap-4 text-xs font-bold overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-hide">
              <button 
                onClick={() => setFilter('all')} 
                className={`pb-1 px-1 border-b-2 transition whitespace-nowrap ${filter === 'all' ? 'text-[#4a2e1b] border-[#4a2e1b]' : 'text-slate-400 border-transparent hover:text-[#4a2e1b]'}`}
              >
                Todos ({totalTickets})
              </button>
              <button 
                onClick={() => setFilter('available')} 
                className={`pb-1 px-1 border-b-2 transition whitespace-nowrap ${filter === 'available' ? 'text-[#4a2e1b] border-[#4a2e1b]' : 'text-slate-400 border-transparent hover:text-[#4a2e1b]'}`}
              >
                Livres ({stats.available})
              </button>
              <button 
                onClick={() => setFilter('pending')} 
                className={`pb-1 px-1 border-b-2 transition whitespace-nowrap ${filter === 'pending' ? 'text-amber-600 border-amber-600' : 'text-slate-400 border-transparent hover:text-amber-600'}`}
              >
                Pendentes ({stats.pending})
              </button>
              <button 
                onClick={() => setFilter('approved')} 
                className={`pb-1 px-1 border-b-2 transition whitespace-nowrap ${filter === 'approved' ? 'text-emerald-700 border-emerald-700' : 'text-slate-400 border-transparent hover:text-emerald-700'}`}
              >
                Pagos ({stats.approved})
              </button>
            </div>
            
            <div className="hidden md:flex items-center gap-4 text-[10px] font-bold opacity-60 uppercase shrink-0">
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#fcfbf9] border border-slate-300"></span> Livre</div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-500"></span> Pendente</div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#4a2e1b]"></span> Pago</div>
            </div>
          </div>

          {/* GRID */}
          <div className="bg-white rounded-[24px] shadow-sm border border-[#e6dcce] p-4 sm:p-6 mb-8">
            <div className="grid grid-cols-5 sm:grid-cols-10 lg:grid-cols-20 gap-1.5 sm:gap-2">
              {(Object.values(numbers) as any[])
                .filter((item: any) => filter === 'all' ? true : item.status === filter)
                .map((item: any) => {
                  let cardStyle = "bg-[#fcfbf9] text-[#4a2e1b] border border-[#e3dacd] hover:border-[#4a2e1b]";
                  if (item.status === 'pending') {
                    cardStyle = "bg-amber-500 text-white border border-amber-600 animate-pulse";
                  } else if (item.status === 'approved') {
                    cardStyle = "bg-[#4a2e1b] text-[#f4ebd9] border border-black/10";
                  }
                  return (
                    <button
                      key={item.number}
                      onClick={() => setSelectedNumber(item.number)}
                      className={`aspect-square rounded-md flex items-center justify-center text-[10px] sm:text-xs font-black transition transform active:scale-95 ${cardStyle}`}
                    >
                      {item.number}
                    </button>
                  );
                })}
            </div>
          </div>
        </section>

      </main>

      {/* RODAPÉ */}
      <footer className="bg-[#4a2e1b]/5 py-4 px-4 sm:px-8 flex items-center justify-center text-[10px] text-[#8c7466] border-t border-[#e6dcce] shrink-0">
        <div 
          onClick={() => (isAdmin ? setShowAdminModal(true) : setShowAdminLogin(true))}
          className="font-bold text-[#4a2e1b] cursor-pointer select-none py-1 hover:text-[#bfa36f] transition"
          title="Acesso Administrativo"
        >
          🐾 POR ELE, POR AMOR! 🐾
        </div>
      </footer>

      {/* MODAL ADMIN CONFIG (FIRST MODAL) */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-[#29170e]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-[#fcfbf9] w-full max-w-2xl rounded-[24px] overflow-hidden shadow-2xl border border-[#ebdcc5] animate-in zoom-in-95 duration-150">
            
            <div className="px-6 py-4 border-b border-[#ebdcc5] flex items-center justify-between bg-white text-[#4a2e1b]">
              <div className="flex items-center gap-2">
                <span className="text-xl">🛠️</span>
                <span className="font-bold text-base">Painel de Configurações da Rifa</span>
              </div>
              <button onClick={() => setShowAdminModal(false)} className="text-slate-400 hover:text-[#4a2e1b] font-bold text-lg transition">✕</button>
            </div>

            <div className="p-6 max-h-[80vh] overflow-y-auto space-y-5">
              <div className="bg-amber-55 border border-amber-200 text-amber-900 rounded-xl p-3.5 text-xs leading-relaxed">
                🐾 <strong>Dica de Organização:</strong> Use os campos abaixo para personalizar em tempo real o cabeçalho de sua rifa, o preço do ponto e os dados de pagamento. Atente-se ao campo <strong>Total de Números</strong> para definir o alcance da sua rifa de forma totalmente editável!
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Nome da Campanha */}
                <div>
                  <label className="block text-[10px] font-bold text-[#8a5d3b] uppercase mb-1">Título da Rifa (Título Principal)</label>
                  <input 
                    type="text" 
                    value={tempCampaignTitle} 
                    onChange={(e) => setTempCampaignTitle(e.target.value)} 
                    placeholder="Ex: RIFA DO CHICO"
                    className="w-full bg-white border border-[#d6cbbe] rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#bfa36f] text-[#4a2e1b] font-semibold"
                  />
                </div>

                {/* 2. Subtítulo da Campanha */}
                <div>
                  <label className="block text-[10px] font-bold text-[#8a5d3b] uppercase mb-1">Subtítulo da Rifa</label>
                  <input 
                    type="text" 
                    value={tempCampaignSubtitle} 
                    onChange={(e) => setTempCampaignSubtitle(e.target.value)} 
                    placeholder="Ex: Ajudando nosso guerreiro no tratamento de saúde"
                    className="w-full bg-white border border-[#d6cbbe] rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#bfa36f] text-[#4a2e1b]"
                  />
                </div>

                {/* 3. Chave PIX */}
                <div>
                  <label className="block text-[10px] font-bold text-[#8a5d3b] uppercase mb-1">Chave PIX Oficial</label>
                  <input 
                    type="text" 
                    value={tempPixKey} 
                    onChange={(e) => setTempPixKey(e.target.value)} 
                    placeholder="Chave para receber os valores"
                    className="w-full bg-white border border-[#d6cbbe] rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#bfa36f] text-[#4a2e1b]"
                  />
                </div>

                {/* 4. Titular do PIX */}
                <div>
                  <label className="block text-[10px] font-bold text-[#8a5d3b] uppercase mb-1">Titular da Conta PIX (Nome Completo)</label>
                  <input 
                    type="text" 
                    value={tempPixName} 
                    onChange={(e) => setTempPixName(e.target.value)} 
                    placeholder="Ex: Diogo Pereira"
                    className="w-full bg-white border border-[#d6cbbe] rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#bfa36f] text-[#4a2e1b]"
                  />
                </div>

                {/* 5. Banco */}
                <div>
                  <label className="block text-[10px] font-bold text-[#8a5d3b] uppercase mb-1">Instituição Bancária (Banco)</label>
                  <input 
                    type="text" 
                    value={tempPixBank} 
                    onChange={(e) => setTempPixBank(e.target.value)} 
                    placeholder="Ex: C6 Bank, Nubank..."
                    className="w-full bg-white border border-[#d6cbbe] rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#bfa36f] text-[#4a2e1b]"
                  />
                </div>

                {/* 6. Valor por bilhete */}
                <div>
                  <label className="block text-[10px] font-bold text-[#8a5d3b] uppercase mb-1">Preço do Número (R$)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0"
                    value={tempTicketPrice} 
                    onChange={(e) => setTempTicketPrice(parseFloat(e.target.value) || 0)} 
                    className="w-full bg-white border border-[#d6cbbe] rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#bfa36f] text-[#4a2e1b] font-medium"
                  />
                </div>

                {/* 7. Senha Admin PIN */}
                <div>
                  <label className="block text-[10px] font-bold text-[#8a5d3b] uppercase mb-1">PIN Secreto de Administrador</label>
                  <input 
                    type="text" 
                    value={tempAdminPin} 
                    onChange={(e) => setTempAdminPin(e.target.value)} 
                    placeholder="PIN para efetuar login"
                    className="w-full bg-white border border-[#d6cbbe] rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#bfa36f] text-[#4a2e1b]"
                  />
                </div>

                {/* 8. Total de bilhetes (Configuração dos Números) - EDITABLE */}
                <div>
                  <label className="block text-[10px] font-bold uppercase mb-1 text-emerald-800 flex items-center gap-1 font-black">
                    🔢 Quantidade Total de Números da Rifa
                  </label>
                  <input 
                    type="number" 
                    min="1"
                    max="10000"
                    value={tempTotalTickets} 
                    onChange={(e) => setTempTotalTickets(parseInt(e.target.value) || 200)} 
                    className="w-full bg-white border-2 border-emerald-600 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#bfa36f] text-[#4a2e1b] font-black focus:border-emerald-600"
                    placeholder="Padrão: 200"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Insira qualquer quantidade máxima de cotas desejada de forma livre.</p>
                </div>
              </div>

              {/* Título da Causa / Frase Secundária */}
              <div>
                <label className="block text-[10px] font-bold text-[#8a5d3b] uppercase mb-1">Frase de Apelo do Card / Título do Desafio (Editar título do anexo 2)</label>
                <input 
                  type="text" 
                  value={tempCauseTitle} 
                  onChange={(e) => setTempCauseTitle(e.target.value)} 
                  placeholder="Ex: Nosso Guerreiro Chico precisa de nós!"
                  className="w-full bg-white border border-[#d6cbbe] rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#bfa36f] text-[#4a2e1b] font-semibold"
                />
              </div>

              {/* Descrição do Propósito */}
              <div>
                <label className="block text-[10px] font-bold text-[#8a5d3b] uppercase mb-1">Descrição do Propósito (Descreva a história)</label>
                <textarea 
                  value={tempCauseDescription} 
                  onChange={(e) => setTempCauseDescription(e.target.value)} 
                  placeholder="Conte um pouco sobre as necessidades de saúde..."
                  className="w-full bg-white border border-[#d6cbbe] rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#bfa36f] text-[#4a2e1b]" 
                  rows={3}
                />
              </div>

              {/* Premiação da Campanha */}
              <div>
                <label className="block text-[10px] font-bold text-[#8a5d3b] uppercase mb-1">🎁 Premiação da Campanha</label>
                <textarea 
                  value={tempPrizeDescription} 
                  onChange={(e) => setTempPrizeDescription(e.target.value)} 
                  placeholder="Ex: BOLA OFICIAL DA COPA 2026..."
                  className="w-full bg-white border border-[#d6cbbe] rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#bfa36f] text-[#4a2e1b] font-medium" 
                  rows={2}
                />
              </div>

              {/* Foto de Chico (Faça upload ou arraste) */}
              <div>
                <label className="block text-[10px] font-bold text-[#8a5d3b] uppercase mb-2">📸 Foto de Perfil da Campanha (Substitui o emoji de cachorrinho 🐕)</label>
                
                <div 
                  className="border-2 border-dashed border-[#d6cbbe] hover:border-[#bfa36f] rounded-2xl p-4 transition text-center bg-[#fcf9f5] cursor-pointer flex flex-col items-center justify-center gap-2 relative"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleImageFileChange(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => document.getElementById('admin-image-upload')?.click()}
                >
                  <input 
                    type="file" 
                    id="admin-image-upload" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleImageFileChange(e.target.files[0]);
                      }
                    }} 
                  />

                  {tempCampaignImage ? (
                    <div className="flex items-center gap-3 w-full">
                      <img src={tempCampaignImage} alt="Preview" className="w-14 h-14 rounded-xl object-cover shrink-0 border border-[#d6cbbe]" />
                      <div className="text-left flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-emerald-700">✓ Imagem carregada!</p>
                        <p className="text-[9px] text-[#8a5d3b]-400">Arraste outra ou clique para alterar</p>
                      </div>
                      <button 
                        type="button" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setTempCampaignImage('');
                          showNotification('Imagem removida.');
                        }}
                        className="bg-red-50 hover:bg-red-100 text-red-600 text-[10px] font-bold px-2 py-1 rounded-md transition"
                      >
                        Remover
                      </button>
                    </div>
                  ) : (
                    <div className="py-2">
                      <span className="text-2xl block mb-1">📸</span>
                      <p className="text-xs text-[#6e5648] font-bold">Arraste uma foto aqui ou <span className="text-[#bfa36f] underline">clique para selecionar</span></p>
                      <p className="text-[9px] text-slate-400 mt-1">Formatos de imagem suportados. Recomendado: quadrado, até 1MB.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* CONFIGURAÇÃO DE CORES DA PALETA (TEMA) */}
              <div className="bg-[#fdfcfb] p-3.5 rounded-2xl border border-[#ebdcc5] space-y-2">
                <h4 className="text-[10px] font-bold text-[#8a5d3b] uppercase tracking-wider flex items-center gap-1.5 border-b pb-1.5 border-[#ebdcc5]">
                  🎨 Cores de Identidade Visual da Campanha
                </h4>
                
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col items-center">
                    <label className="text-[8px] font-bold text-slate-500 uppercase mb-1 text-center leading-tight">Fundo Geral</label>
                    <div className="flex items-center gap-1">
                      <input 
                        type="color" 
                        value={tempThemeBg} 
                        onChange={(e) => setTempThemeBg(e.target.value)} 
                        className="w-8 h-8 rounded-full border border-slate-300 cursor-pointer overflow-hidden p-0"
                      />
                    </div>
                    <span className="text-[9px] font-mono font-bold text-slate-600 mt-1 uppercase select-all">{tempThemeBg}</span>
                  </div>

                  <div className="flex flex-col items-center">
                    <label className="text-[8px] font-bold text-slate-500 uppercase mb-1 text-center leading-tight">Destaques</label>
                    <div className="flex items-center gap-1">
                      <input 
                        type="color" 
                        value={tempThemePrimary} 
                        onChange={(e) => setTempThemePrimary(e.target.value)} 
                        className="w-8 h-8 rounded-full border border-slate-300 cursor-pointer overflow-hidden p-0"
                      />
                    </div>
                    <span className="text-[9px] font-mono font-bold text-slate-600 mt-1 uppercase select-all">{tempThemePrimary}</span>
                  </div>

                  <div className="flex flex-col items-center">
                    <label className="text-[8px] font-bold text-slate-500 uppercase mb-1 text-center leading-tight">Cabeçalho</label>
                    <div className="flex items-center gap-1">
                      <input 
                        type="color" 
                        value={tempThemeSecondary} 
                        onChange={(e) => setTempThemeSecondary(e.target.value)} 
                        className="w-8 h-8 rounded-full border border-slate-300 cursor-pointer overflow-hidden p-0"
                      />
                    </div>
                    <span className="text-[9px] font-mono font-bold text-slate-600 mt-1 uppercase select-all">{tempThemeSecondary}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowAdminModal(false)} 
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2.5 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button 
                  type="button" 
                  onClick={handleSaveConfig} 
                  className="flex-1 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs py-2.5 rounded-xl shadow transition animate-pulse"
                >
                  Salvar Alterações
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* MODAL RESERVA E EDIÇÃO DO NÚMERO (SLEEK) */}
      {selectedNumber !== null && (() => {
        const item = numbers[selectedNumber];
        return (
          <div className="fixed inset-0 bg-[#29170e]/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#fcfbf9] w-full max-w-sm rounded-[24px] overflow-hidden shadow-2xl border border-[#e6dcce] animate-in zoom-in-95 duration-150">
              
              <div className="px-5 py-4 border-b border-[#e6dcce] flex items-center justify-between bg-white text-[#4a2e1b]">
                <div className="flex items-center gap-3">
                  <span className="bg-[#4a2e1b] text-white text-xs w-8 h-8 rounded-lg flex items-center justify-center font-black">
                    {selectedNumber}
                  </span>
                  <span className="font-bold text-sm">{isAdmin ? "Admin (Editar)" : "Reserva"}</span>
                </div>
                <button onClick={() => setSelectedNumber(null)} className="text-slate-400 hover:text-[#4a2e1b] font-bold text-lg transition">✕</button>
              </div>

              <div className="p-5">
                {isAdmin ? (
                  <form onSubmit={handleAdminSaveSingle} className="space-y-4">
                    <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-2 text-center text-[10px] font-semibold">
                      ✍️ Digite o nome da pessoa abaixo para o número {selectedNumber}
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#8a5d3b] uppercase mb-1">Nome do Comprador</label>
                      <input type="text" value={adminEditName} onChange={(e) => setAdminEditName(e.target.value)} placeholder="Ex: Maria" className="w-full bg-white border border-[#d6cbbe] rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#bfa36f] text-[#4a2e1b] font-bold" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#8a5d3b] uppercase mb-1">Contato (Opcional)</label>
                      <input type="text" value={adminEditPhone} onChange={(e) => setAdminEditPhone(e.target.value)} placeholder="(00) 00000-0000" className="w-full bg-white border border-[#d6cbbe] rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#bfa36f] text-[#4a2e1b]" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#8a5d3b] uppercase mb-1">Status Interno</label>
                      <div className="grid grid-cols-3 gap-2">
                        <button type="button" onClick={() => setAdminEditStatus('available')} className={`py-1.5 rounded-xl text-[10px] font-bold border transition ${adminEditStatus === 'available' ? 'bg-[#fcfbf9] text-slate-700 border-slate-400 shadow-sm' : 'bg-white text-gray-400 border-transparent'}`}>Livre</button>
                        <button type="button" onClick={() => setAdminEditStatus('pending')} className={`py-1.5 rounded-xl text-[10px] font-bold border transition ${adminEditStatus === 'pending' ? 'bg-amber-500 text-white border-amber-600 shadow-sm' : 'bg-white text-gray-400 border-transparent'}`}>Pendente</button>
                        <button type="button" onClick={() => setAdminEditStatus('approved')} className={`py-1.5 rounded-xl text-[10px] font-bold border transition ${adminEditStatus === 'approved' ? 'bg-[#4a2e1b] text-white border-[#382213] shadow-sm' : 'bg-white text-gray-400 border-transparent'}`}>Pago</button>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button type="button" onClick={handleAdminQuickRelease} className="bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-bold text-[10px] px-3 py-2 rounded-xl transition">Zerar</button>
                      <button type="submit" className="flex-1 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-[10px] py-2 rounded-xl shadow transition">Salvar</button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    {item.status === 'available' && (
                      <div className="space-y-4">
                        <div className="bg-[#fcede0] border border-[#e8d2bd] rounded-xl p-4 text-[10px] text-[#594439] space-y-2">
                          <p className="font-bold text-[#8a5d3b] uppercase tracking-wider mb-2 text-center text-[10px]">Já copiou a chave PIX? 👇</p>
                          <div className="bg-white border border-[#d9c49c] rounded-lg p-2.5 flex justify-between items-center w-full">
                            <span className="font-mono text-[11px] text-[#4a2e1b] font-black truncate max-w-[150px]">{pixKey}</span>
                            <button onClick={handleCopyPix} className="bg-[#4a2e1b] hover:bg-[#593923] text-white text-[9px] font-bold px-2 py-1 rounded transition uppercase">Copiar</button>
                          </div>
                        </div>

                        <form onSubmit={handleReserve} className="space-y-3 pt-1">
                          <p className="text-[10px] font-bold text-[#8a5d3b] uppercase text-center">Informe seu nome e confirme</p>
                          <div>
                            <input type="text" required value={buyerName} onChange={(e) => setBuyerName(e.target.value)} placeholder="Seu Nome Completo" className="w-full bg-white border border-[#d6cbbe] rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#bfa36f] text-center font-bold" />
                          </div>
                          <div>
                            <input type="text" value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value)} placeholder="WhatsApp ou Telefone (Opcional)" className="w-full bg-white border border-[#d6cbbe] rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#bfa36f] text-center" />
                          </div>
                          <button type="submit" className="w-full bg-[#4a2e1b] hover:bg-[#593923] text-white font-black text-[11px] py-3 rounded-xl shadow-md transition mt-2 animate-bounce">
                            RESERVAR AGORA O {selectedNumber}
                          </button>
                        </form>
                      </div>
                    )}

                    {item.status === 'pending' && (
                      <div className="space-y-3 text-center py-5">
                        <div className="text-3xl mb-2 animate-bounce">⏳</div>
                        <h4 className="text-sm font-bold text-amber-800 uppercase tracking-tight">Em Análise</h4>
                        <p className="text-[11px] text-[#6e5648] px-2 leading-relaxed">
                          Reservado para <strong>{item.name ? item.name : 'Alguém'}</strong>.<br/>Aguardando validação do PIX da organização.
                        </p>
                      </div>
                    )}

                    {item.status === 'approved' && (
                      <div className="space-y-3 text-center py-5">
                        <div className="text-3xl mb-2">🎉</div>
                        <h4 className="text-sm font-bold text-emerald-800 uppercase tracking-tight">Ponto Confirmado!</h4>
                        <p className="text-[11px] text-[#6e5648] px-2 leading-relaxed">
                          Este número pertence a <strong>{item.name ? item.name : 'Alguém'}</strong>.<br/>Boa sorte e obrigado por ajudar o Chico!
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL ADMIN LOGIN (🔐) */}
      {showAdminLogin && (
        <div className="fixed inset-0 bg-[#29170e]/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-xs rounded-[24px] p-6 shadow-2xl border border-[#ebdcc5] animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 border-b pb-3 border-slate-100">
              <h3 className="font-bold text-[#4a2e1b] text-sm">Organizador</h3>
              <button onClick={() => { setShowAdminLogin(false); setPinInput(''); }} className="text-slate-400 font-bold hover:text-[#4a2e1b]">✕</button>
            </div>
            
            <form onSubmit={handleAdminLogin} className="space-y-3">
              <input type="password" required value={pinInput} onChange={(e) => setPinInput(e.target.value)} placeholder="Digite o PIN (ex: 1234)" className="w-full bg-[#fcf9f5] border border-[#d6cbbe] rounded-xl px-3 py-2.5 text-center text-sm font-bold tracking-widest focus:outline-none" />
              <button type="submit" className="w-full bg-[#4a2e1b] text-white font-bold text-xs py-2.5 rounded-xl transition hover:bg-[#5a3b25] shadow-sm active:scale-95">
                ENTRAR COM PIN
              </button>
            </form>


          </div>
        </div>
      )}

    </div>
  );
}
