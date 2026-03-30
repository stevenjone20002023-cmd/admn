// ملف: admn/script.js
import { getFirestore, collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, getDoc, setDoc, writeBatch } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const config = window.MY_STORE_CONFIG;
const db = getFirestore(window.app);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(err => console.log(err));
  });
}

let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => { 
    e.preventDefault(); 
    deferredPrompt = e; 
    const installBanner = document.getElementById('install-banner');
    if(installBanner) installBanner.style.display = 'flex'; 
});

document.addEventListener('DOMContentLoaded', () => {
    const installBtn = document.getElementById('install-btn');
    const closeInstall = document.getElementById('close-install');
    
    if(installBtn) {
        installBtn.addEventListener('click', async () => { 
            if(deferredPrompt) { 
                deferredPrompt.prompt(); 
                deferredPrompt = null; 
                const installBanner = document.getElementById('install-banner');
                if(installBanner) installBanner.style.display = 'none'; 
            } 
        });
    }
    if(closeInstall) {
        closeInstall.addEventListener('click', () => {
            const installBanner = document.getElementById('install-banner');
            if(installBanner) installBanner.style.display = 'none';
        });
    }
});

window.checkLogin = function() {
    const code = document.getElementById('login-input').value.toString().trim();
    if(code === config.security.adminCode.toString().trim()) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-container').style.display = 'block';
    } else {
        document.getElementById('login-error').style.display = 'block';
    }
}

window.switchTab = function(tabId, btnElement) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    btnElement.classList.add('active');
    window.scrollTo(0,0);
}

window.showDesignSection = function(sectionId) {
    document.getElementById('design-menu').style.display = 'none';
    document.getElementById('banner-section').style.display = 'none';
    document.getElementById('category-section').style.display = 'none';
    if(sectionId === 'menu') {
        document.getElementById('design-menu').style.display = 'block';
    } else {
        document.getElementById(sectionId).style.display = 'block';
    }
}

onSnapshot(doc(db, 'settings', 'news'), docSnap => {
    if(docSnap.exists()) {
        const i = document.getElementById('news-input');
        if(i) i.value = docSnap.data().text || '';
    }
});

window.updateNews = async function() {
    const text = document.getElementById('news-input').value;
    document.getElementById('news-status').innerText = "جاري التحديث...";
    try {
        await setDoc(doc(db, 'settings', 'news'), { text: text });
        document.getElementById('news-status').innerText = "✅ تم تحديث الأخبار";
        document.getElementById('news-status').style.color = "green";
        setTimeout(() => document.getElementById('news-status').innerText = "", 3000);
    } catch(e) {
        document.getElementById('news-status').innerText = "❌ حدث خطأ";
    }
}

window.compressImage = function(file) {
    return new Promise((resolve, reject) => {
        if (!file) { resolve(null); return; }
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    let width = img.width;
                    let height = img.height;
                    const maxWidth = 800; 
                    const maxHeight = 800;
                    
                    if (width > height) {
                        if (width > maxWidth) {
                            height *= maxWidth / width;
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width *= maxHeight / height;
                            height = maxHeight;
                        }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.7); 
                    resolve(dataUrl);
                } catch(e) { reject(new Error("فشل معالجة الصورة")); }
            };
            img.onerror = () => reject(new Error("الصورة غير صالحة"));
            img.src = event.target.result;
        };
        reader.onerror = () => reject(new Error("فشل قراءة الملف"));
        reader.readAsDataURL(file);
    });
}

onSnapshot(collection(db, 'banners'), snapshot => {
    const list = document.getElementById('banners-list-container');
    list.innerHTML = "";
    if(!snapshot.empty) {
        snapshot.forEach(docSnap => {
            const key = docSnap.id;
            const b = docSnap.data();
            list.innerHTML += `<div class="banner-list-item"><div style="display:flex; align-items:center; gap:10px;"><img src="${b.image}" class="banner-preview"><span style="font-size:12px;">${b.title || 'بدون عنوان'}</span></div><button class="delete-btn" onclick="deleteBanner('${key}')">X</button></div>`;
        });
    } else { list.innerHTML = "<p style='font-size:12px; color:#999; text-align:center;'>لا توجد بنرات حالياً</p>"; }
});

window.uploadBanner = async function() {
    const title = document.getElementById('banner-title').value;
    const fileInput = document.getElementById('banner-img');
    if(fileInput.files.length === 0) return alert("اختر صورة");
    document.getElementById('banner-status').innerText = "جاري الرفع...";
    
    try {
        const imgUrl = await compressImage(fileInput.files[0]);
        if(imgUrl) {
            await addDoc(collection(db, 'banners'), { title: title, image: imgUrl });
            document.getElementById('banner-status').innerText = "✅ تم";
            document.getElementById('banner-status').style.color = "green";
            fileInput.value = ""; document.getElementById('banner-title').value = "";
        }
    } catch (error) {
        document.getElementById('banner-status').innerText = "❌ خطأ";
        alert(error.message);
    }
}
window.deleteBanner = function(key) { if(confirm("حذف هذا البنر؟")) deleteDoc(doc(db, 'banners', key)).catch(e => alert(e.message)); }

onSnapshot(collection(db, 'categories'), snapshot => {
    const select = document.getElementById('p-cat-select');
    const listManage = document.getElementById('categories-list-manage');
    select.innerHTML = '<option value="general">عام</option>'; 
    listManage.innerHTML = "";
    if(!snapshot.empty) {
        snapshot.forEach(docSnap => {
            const key = docSnap.id;
            const cat = docSnap.data();
            select.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
            listManage.innerHTML += `<div class="banner-list-item"><div style="display:flex; align-items:center; gap:10px;"><img src="${cat.image}" class="banner-preview" style="border-radius:50%;"><span style="font-size:12px;">${cat.name}</span></div><div><button class="delete-btn" style="background:#3498db; margin-left:5px;" onclick="editCategory('${key}')">تعديل</button><button class="delete-btn" onclick="deleteCategory('${key}')">X</button></div></div>`;
        });
    } else { listManage.innerHTML = "<p style='font-size:12px; color:#999; text-align:center;'>لا توجد تصنيفات</p>"; }
});

window.uploadCategory = async function() {
    const name = document.getElementById('cat-name-new').value;
    const fileInput = document.getElementById('cat-img-new');
    if(!name || fileInput.files.length === 0) return alert("البيانات ناقصة");
    document.getElementById('cat-status').innerText = "جاري...";
    
    try {
        const imgUrl = await compressImage(fileInput.files[0]);
        if(imgUrl) {
            const catId = name.replace(/\s+/g, '_'); 
            await addDoc(collection(db, 'categories'), { name: name, image: imgUrl, id: catId });
            document.getElementById('cat-status').innerText = "✅ تم";
            fileInput.value = ""; document.getElementById('cat-name-new').value = "";
        }
    } catch (error) {
        document.getElementById('cat-status').innerText = "❌ خطأ";
        alert(error.message);
    }
}
window.deleteCategory = function(key) { if(confirm("حذف هذا التصنيف؟")) deleteDoc(doc(db, 'categories', key)).catch(e => alert(e.message)); }

window.editCategory = async function(key) {
    const docSnap = await getDoc(doc(db, 'categories', key));
    if (docSnap.exists()) {
        const data = docSnap.data();
        document.getElementById('cat-name-new').value = data.name;
        document.getElementById('cat-action-btn').innerText = "تحديث التصنيف";
        document.getElementById('cat-action-btn').onclick = function() { updateCategory(key, data.image); };
        window.scrollTo(0,0);
    }
}

window.updateCategory = async function(key, oldImage) {
    const name = document.getElementById('cat-name-new').value;
    const fileInput = document.getElementById('cat-img-new');
    if(!name) return alert("الاسم مطلوب");
    document.getElementById('cat-status').innerText = "جاري التحديث...";
    
    try {
        let imgUrl = oldImage;
        if(fileInput.files.length > 0) {
            imgUrl = await compressImage(fileInput.files[0]);
        }
        
        await updateDoc(doc(db, 'categories', key), { name: name, image: imgUrl });
        
        document.getElementById('cat-status').innerText = "✅ تم التحديث";
        resetCategoryForm();
    } catch (error) {
        document.getElementById('cat-status').innerText = "❌ خطأ";
        alert(error.message);
    }
}

window.resetCategoryForm = function() {
    document.getElementById('cat-name-new').value = "";
    document.getElementById('cat-img-new').value = "";
    document.getElementById('cat-action-btn').innerText = "إنشاء التصنيف";
    document.getElementById('cat-action-btn').onclick = uploadCategory;
}

onSnapshot(collection(db, 'products'), snapshot => {
    const list = document.getElementById('products-list-manage');
    list.innerHTML = "";
    if(!snapshot.empty) {
        const docs = [];
        snapshot.forEach(d => docs.push({id: d.id, data: d.data()}));
        docs.reverse().forEach(item => {
            const key = item.id;
            const p = item.data;
            list.innerHTML += `<div class="banner-list-item"><div style="display:flex; align-items:center; gap:10px;"><img src="${p.image}" class="banner-preview"><div style="font-size:12px;"><div>${p.title}</div><div style="color:red;">${p.price || 0} د.ع</div></div></div><div><button class="delete-btn" style="background:#3498db; margin-left:5px;" onclick="editProduct('${key}')">تعديل</button><button class="delete-btn" onclick="deleteProduct('${key}')">X</button></div></div>`;
        });
    } else { list.innerHTML = "<p style='font-size:12px; color:#999; text-align:center;'>لا توجد منتجات</p>"; }
});

window.uploadProduct = async function() {
    const fileInput = document.getElementById('p-img');
    const name = document.getElementById('p-name').value;
    const price = document.getElementById('p-price').value;
    const desc = document.getElementById('p-desc').value;
    const cat = document.getElementById('p-cat-select').value;
    
    if(fileInput.files.length === 0 || !name) return alert("البيانات ناقصة (الصورة الأساسية والاسم مطلوبان)");
    document.getElementById('prod-status').innerText = "جاري الرفع...";
    
    try {
        const imgUrl = await compressImage(fileInput.files[0]);
        
        const extraImages = [];
        const img1 = document.getElementById('p-image-1').files[0];
        const img2 = document.getElementById('p-image-2').files[0];
        const img3 = document.getElementById('p-image-3').files[0];
        
        if(img1) { const e1 = await compressImage(img1); if(e1) extraImages.push(e1); }
        if(img2) { const e2 = await compressImage(img2); if(e2) extraImages.push(e2); }
        if(img3) { const e3 = await compressImage(img3); if(e3) extraImages.push(e3); }
        
        if(imgUrl) {
            await addDoc(collection(db, 'products'), { 
                image: imgUrl, 
                images: extraImages,
                title: name, 
                price: price,
                description: desc, 
                category: cat, 
                date: serverTimestamp() 
            });
            document.getElementById('prod-status').innerText = "✅ تم النشر";
            resetProductForm();
        }
    } catch (error) {
        document.getElementById('prod-status').innerText = "❌ خطأ";
        alert(error.message);
    }
}
window.deleteProduct = function(key) { if(confirm("حذف هذا المنتج؟")) deleteDoc(doc(db, 'products', key)).catch(e => alert(e.message)); }

window.editProduct = async function(key) {
    const docSnap = await getDoc(doc(db, 'products', key));
    if (docSnap.exists()) {
        const data = docSnap.data();
        document.getElementById('p-name').value = data.title;
        document.getElementById('p-price').value = data.price || '';
        document.getElementById('p-desc').value = data.description || '';
        document.getElementById('p-cat-select').value = data.category || 'general';
        
        document.getElementById('prod-action-btn').innerText = "تحديث المنتج";
        document.getElementById('prod-action-btn').onclick = function() { updateProduct(key, data.image, data.images); };
        switchTab('tab-add-product', document.querySelector('.nav-btn:first-child'));
    }
}

window.updateProduct = async function(key, oldImage, oldImages) {
    const name = document.getElementById('p-name').value;
    const price = document.getElementById('p-price').value;
    const desc = document.getElementById('p-desc').value;
    const cat = document.getElementById('p-cat-select').value;
    const fileInput = document.getElementById('p-img');
    
    if(!name) return alert("الاسم مطلوب");
    document.getElementById('prod-status').innerText = "جاري التحديث...";
    
    try {
        let imgUrl = oldImage;
        if(fileInput.files.length > 0) {
            imgUrl = await compressImage(fileInput.files[0]);
        }

        let extraImages = oldImages || [];
        const img1 = document.getElementById('p-image-1').files[0];
        const img2 = document.getElementById('p-image-2').files[0];
        const img3 = document.getElementById('p-image-3').files[0];
        
        if(img1 || img2 || img3) {
            extraImages = [];
            if(img1) { const e1 = await compressImage(img1); if(e1) extraImages.push(e1); }
            if(img2) { const e2 = await compressImage(img2); if(e2) extraImages.push(e2); }
            if(img3) { const e3 = await compressImage(img3); if(e3) extraImages.push(e3); }
        }
        
        await updateDoc(doc(db, 'products', key), { 
            title: name, 
            price: price,
            description: desc, 
            category: cat, 
            image: imgUrl,
            images: extraImages
        });
        
        document.getElementById('prod-status').innerText = "✅ تم التحديث";
        resetProductForm();
    } catch (error) {
        document.getElementById('prod-status').innerText = "❌ خطأ";
        alert(error.message);
    }
}

window.resetProductForm = function() {
    document.getElementById('p-name').value = "";
    document.getElementById('p-price').value = "";
    document.getElementById('p-desc').value = "";
    document.getElementById('p-img').value = "";
    document.getElementById('p-image-1').value = "";
    document.getElementById('p-image-2').value = "";
    document.getElementById('p-image-3').value = "";
    document.getElementById('prod-action-btn').innerText = "نشر المنتج الآن";
    document.getElementById('prod-action-btn').onclick = uploadProduct;
}

const orderColors = ['#ffe6e6', '#e6f2ff', '#e6ffe6', '#ffffe6', '#f2e6ff'];

onSnapshot(collection(db, 'orders'), snapshot => {
    const pendingList = document.getElementById('pending-orders-list');
    const preparedList = document.getElementById('prepared-orders-list');
    if(!pendingList || !preparedList) return;
    
    pendingList.innerHTML = "";
    preparedList.innerHTML = "";
    
    if(!snapshot.empty) {
        let hasPending = false;
        let hasPrepared = false;

        const docs = [];
        snapshot.forEach(d => docs.push({id: d.id, data: d.data()}));

        let colorIndexPending = 0;
        let colorIndexPrepared = 0;

        docs.reverse().forEach(item => {
            const key = item.id;
            const order = item.data;
            const orderNumDisplay = order.orderNumber || key.substring(0, 5);
            
            let orderItemsHtml = "";
            if(order.cart && Array.isArray(order.cart)) {
                order.cart.forEach(item => {
                    orderItemsHtml += `
                        <div style="display:flex; align-items:center; gap:10px; margin-top:5px; padding:5px; border-bottom:1px solid #eee;">
                            <img src="${item.image}" style="width:50px; height:50px; object-fit:contain; border-radius:4px; border:1px solid #ddd;">
                            <div style="font-size:13px; font-weight:bold;">${item.title} (الكمية: ${item.qty}) <br><span style="color:#e74c3c; display:inline-block; margin-top:5px;">العمر المحدد: ${item.age || 1}</span></div>
                        </div>
                    `;
                });
            }

            const totalHtml = `<div style="margin-top:10px; padding-top:10px; border-top:2px dashed #ccc; font-weight:bold; color:#2ecc71; font-size:15px;">المبلغ الكلي مع التوصيل: ${(order.totalAmount || 0).toLocaleString()} دينار عراقي</div>`;
            const notesSupplierHtml = order.notesSupplier ? `<div style="margin-top:5px; color:#e67e22; font-weight:bold;">ملاحظة: ${order.notesSupplier}</div>` : '';

            const isPrepared = order.status === 'prepared' || order.status === 'completed'; 

            let currentBg = "#fff";
            if(isPrepared) {
                currentBg = orderColors[colorIndexPrepared % orderColors.length];
                colorIndexPrepared++;
            } else {
                currentBg = orderColors[colorIndexPending % orderColors.length];
                colorIndexPending++;
            }

            const orderHtml = `
                <div class="order-item ${isPrepared ? 'prepared-item' : 'pending-item'}" data-ordernum="${orderNumDisplay}" data-id="${key}" style="background-color: ${currentBg};">
                    <div class="order-header">
                        <span>طلب #${orderNumDisplay}</span>
                    </div>
                    <div class="order-details">
                        <div>الاسم: ${order.name}</div>
                        <div>رقم الهاتف: ${order.phone}</div>
                        <div>المحافظة: ${order.gov}</div>
                        <div>العنوان/أقرب نقطة دالة: ${order.address}</div>
                        ${notesSupplierHtml}
                        <div style="margin-top:10px; font-weight:bold;">المنتجات:</div>
                        ${orderItemsHtml}
                        ${totalHtml}
                    </div>
                    ${!isPrepared ? `<button class="action-btn" style="width:100%; margin-top:15px; background:#2ecc71;" onclick="markOrderPrepared('${key}')">تم التجهيز</button>` : ''}
                    ${isPrepared ? `<button class="delete-btn" style="width:100%; margin-top:10px; padding:12px; background:#ff4757;" onclick="deleteOrder('${key}')">حذف الطلب</button>` : ''}
                </div>
            `;

            if(isPrepared) {
                preparedList.innerHTML += orderHtml;
                hasPrepared = true;
            } else {
                pendingList.innerHTML += orderHtml;
                hasPending = true;
            }
        });

        if(!hasPending) pendingList.innerHTML = "<p style='font-size:12px; color:#999; text-align:center;'>لا توجد طلبات جديدة</p>";
        if(!hasPrepared) preparedList.innerHTML = "<p style='font-size:12px; color:#999; text-align:center;'>لا توجد طلبات مجهزة</p>";

    } else {
        pendingList.innerHTML = "<p style='font-size:12px; color:#999; text-align:center;'>لا توجد طلبات جديدة</p>";
        preparedList.innerHTML = "<p style='font-size:12px; color:#999; text-align:center;'>لا توجد طلبات مجهزة</p>";
    }
});

window.markOrderPrepared = function(key) {
    updateDoc(doc(db, 'orders', key), { status: 'prepared' }).catch(e => alert(e.message));
}

window.deleteOrder = function(key) {
    if(confirm("هل أنت متأكد من حذف هذا الطلب نهائياً؟")) {
        deleteDoc(doc(db, 'orders', key)).catch(e => alert(e.message));
    }
}

window.printAllOrders = function() {
    alert("الخدمه غير متصله في الشركة");
}

window.prepareAllOrders = async function() {
    const items = document.querySelectorAll('.pending-item');
    if(items.length === 0) return alert("لا توجد طلبات جديدة لتجهيزها");
    if(!confirm("هل أنت متأكد من تجهيز جميع الطلبات الجديدة؟")) return;
    
    const batch = writeBatch(db);
    items.forEach(item => {
        const key = item.getAttribute('data-id');
        batch.update(doc(db, 'orders', key), { status: 'prepared' });
    });
    await batch.commit().catch(e => alert(e.message));
}

window.deleteAllPrepared = async function() {
    const items = document.querySelectorAll('.prepared-item');
    if(items.length === 0) return alert("لا توجد طلبات مجهزة لحذفها");
    if(!confirm("هل أنت متأكد من حذف جميع الطلبات المجهزة نهائياً؟")) return;

    const batch = writeBatch(db);
    items.forEach(item => {
        const key = item.getAttribute('data-id');
        batch.delete(doc(db, 'orders', key));
    });
    await batch.commit().catch(e => alert(e.message));
}

window.searchPreparedOrders = function() {
    const term = document.getElementById('search-prepared').value.toLowerCase().trim();
    const items = document.querySelectorAll('.prepared-item');
    items.forEach(item => {
        const orderNum = item.getAttribute('data-ordernum').toLowerCase();
        if(orderNum.includes(term)) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}
