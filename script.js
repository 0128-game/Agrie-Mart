const SUPABASE_URL = 'https://jfahidfpklykpkonuvhj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmYWhpZGZwa2x5a3Brb251dmhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NTg3ODAsImV4cCI6MjA2ODMzNDc4MH0.KcRRAsLt0xPvf8XnQ0v-fYzwDk5vxXKWC7s53_GUvqA'; // あなたのAnon Keyをここに貼り付け

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
console.log('Supabaseクライアントが初期化されました！', supabaseClient);

// --- HTML要素の取得 ---
const searchMenuButton = document.getElementById("searchMenu");
const menuNumberInput = document.getElementById("menunum");
const outputDiv = document.getElementById("output");
const orderControlsDiv = document.getElementById("orderControls");
const quantityInput = document.getElementById("quantity");
const addToCartButton = document.getElementById("addToCart");
const orderTableBody = document.getElementById("orderTableBody");
const totalAmountSpan = document.getElementById("totalAmount");
const placeOrderButton = document.getElementById("placeOrder");


// --- グローバル変数 ---
let currentSelectedItem = null;
let cartItems = [];

// --- 関数定義 ---

/**
 * カートの内容をHTMLテーブルに表示し、合計金額を更新します。
 */
function displayCart() {
    if (!orderTableBody || !totalAmountSpan) return;

    orderTableBody.innerHTML = ''; // テーブルの中身を一度クリア

    let totalAmount = 0;

    if (cartItems.length === 0) {
        orderTableBody.innerHTML = '<tr><td colspan="6">まだ商品がありません。</td></tr>';
    } else {
        cartItems.forEach((item, index) => {
            const subtotal = item.cost * item.quantity;
            totalAmount += subtotal;

            const row = orderTableBody.insertRow();
            // ★ここを修正しました
            row.innerHTML = `
                <td>${item.menuid}</td>
                <td>${item.name || '不明'}</td>
                <td>${item.cost || '不明'}円</td>
                <td>${item.quantity}</td>
                <td>${subtotal}円</td>
                <td><button class="remove-item-btn" data-index="${index}">削除</button></td>
            `;
        });
    }
    // ★ここを修正しました
    totalAmountSpan.textContent = `${totalAmount}円`;

    const removeButtons = document.querySelectorAll('.remove-item-btn');
    removeButtons.forEach(button => {
        button.onclick = (event) => {
            const indexToRemove = parseInt(event.target.dataset.index, 10);
            removeItemFromCart(indexToRemove);
        };
    });
}

/**
 * カートから指定されたインデックスの商品を削除します。
 * @param {number} index - 削除する商品のインデックス
 */
function removeItemFromCart(index) {
    cartItems.splice(index, 1);
    displayCart(); // カート表示を更新
}


// --- イベントリスナー ---

/**
 * メニュー検索ボタンがクリックされた時の処理。
 * 入力されたメニューIDに基づいてSupabaseからメニュー情報を取得し表示します。
 */
if (searchMenuButton) {
    searchMenuButton.addEventListener('click', async () => {
        const menuNum = menuNumberInput ? menuNumberInput.value : '';

        if (!menuNum) {
            if (outputDiv) outputDiv.textContent = "メニューIDを入力してください。";
            currentSelectedItem = null;
            orderControlsDiv.style.display = 'none';
            return;
        }

        const parsedMenuId = parseInt(menuNum, 10);
        if (isNaN(parsedMenuId)) {
            if (outputDiv) outputDiv.textContent = "有効なメニューIDを入力してください（半角数字）。";
            currentSelectedItem = null;
            orderControlsDiv.style.display = 'none';
            return;
        }

        const { data: specificMenuItem, error } = await supabaseClient
            .from('menu') // 'menu' テーブルから検索
            .select('*')
            .eq('menuid', parsedMenuId); // menuidカラムで検索

        if (error) {
            console.error('特定のメニューの取得中にエラー:', error.message);
            // ★ここを修正しました
            if (outputDiv) outputDiv.textContent = `メニューデータの取得中にエラーが発生しました: ${error.message}`;
            currentSelectedItem = null;
            orderControlsDiv.style.display = 'none';
        } else if (specificMenuItem && specificMenuItem.length > 0) {
            const item = specificMenuItem[0];
            currentSelectedItem = item; // 見つかったアイテムをグローバル変数に保存

            if (outputDiv) {
                // ★ここを修正しました
                outputDiv.innerHTML = `
                    <h2>選択されたメニュー</h2>
                    <p><strong>メニュー番号:</strong> ${item.menuid}</p>
                    <p><strong>名前:</strong> ${item.name || '不明'}</p>
                    <p><strong>値段:</strong> ${item.price || '不明'}円</p>
                `;
            }
            orderControlsDiv.style.display = 'block'; // 数量入力欄を表示
            quantityInput.value = 1; // 数量を1にリセット
        } else {
            // ★ここを修正しました
            if (outputDiv) outputDiv.textContent = `メニューID「${menuNum}」のメニューは見つかりませんでした。`;
            currentSelectedItem = null;
            orderControlsDiv.style.display = 'none';
        }
    });
} else {
    console.warn("ID 'searchMenu' のボタンが見つかりません。HTMLに <button id='searchMenu'></button> を追加してください。");
}

/**
 * カートに追加ボタンがクリックされた時の処理。
 * 選択中のメニューをカートに追加または数量を更新します。
 */
if (addToCartButton) {
    addToCartButton.addEventListener('click', () => {
        if (!currentSelectedItem) {
            alert('まずメニューを検索して選択してください。');
            return;
        }

        const quantity = parseInt(quantityInput.value, 10);
        if (isNaN(quantity) || quantity <= 0) {
            alert('有効な数量を入力してください。');
            return;
        }

        // カート内に同じ商品が既にあるかチェックし、あれば数量を更新
        const existingItemIndex = cartItems.findIndex(item => item.menuid === currentSelectedItem.menuid);

        if (existingItemIndex > -1) {
            cartItems[existingItemIndex].quantity += quantity;
        } else {
            // なければ新しい商品として追加
            cartItems.push({
                menuid: currentSelectedItem.menuid,
                name: currentSelectedItem.name,
                cost: currentSelectedItem.price, // menuテーブルのpriceカラムをcartItemsではcostとして使用
                quantity: quantity
            });
        }

        console.log('カートの内容:', cartItems);
        displayCart(); // カート表示を更新
        // ★ここを修正しました
        alert(`${currentSelectedItem.name} を ${quantity} 個カートに追加しました！`);
    });
} else {
    console.warn("ID 'addToCart' のボタンが見つかりません。HTMLに <button id='addToCart'></button> を追加してください。");
}

/**
 * 注文確定ボタンがクリックされた時の処理。
 * 注文情報とカート内容をSupabaseに記録します。
 */
if (placeOrderButton) {
    placeOrderButton.addEventListener('click', async () => {
        if (cartItems.length === 0) {
            alert('カートに商品がありません。');
            return;
        }

        const totalAmount = cartItems.reduce((sum, item) => sum + (item.cost * item.quantity), 0);
        const callNumber = Math.floor(Math.random() * 900) + 100; // 3桁の呼び出し番号

        let orderSuccess = false;

        try {
            // 1. 'orders' テーブルに注文概要を挿入
            const { data: orderData, error: orderError } = await supabaseClient
                .from('orders') // ★テーブル名を 'orders' に修正
                .insert([
                    {
                        call_number: callNumber,   // ★カラム名を 'call_number' に修正
                        total_amount: totalAmount, // ★カラム名を 'total_amount' に修正
                        status: 'pending'          // ★'status' カラムを追加 (JS側で設定)
                    }
                ])
                .select(); // 挿入したデータを返す

            if (orderError) {
                // ★ここを修正しました
                throw new Error(`注文概要登録エラー: ${orderError.message || '不明なエラー'}`);
            }

            // 挿入された orders の order_id を取得 (order_items の外部キーとして使用)
            const newOrderId = orderData[0].order_id; // orders テーブルの PK は order_id になる

            console.log('orders テーブルに登録成功:', orderData);

            // 2. 'order_items' テーブルに各注文品目を挿入
            const orderItemsToInsert = cartItems.map(item => ({
                order_id: newOrderId,          // ★orders テーブルから取得した order_id を使用
                menu_id: item.menuid,          // ★カラム名を 'menu_id' に修正
                item_name: item.name,          // ★カラム名を 'item_name' に修正
                item_price: item.cost,         // ★カラム名を 'item_price' に修正
                quantity: item.quantity,       // ★カラム名を 'quantity' に修正
                subtotal: item.cost * item.quantity // ★カラム名を 'subtotal' に修正
            }));

            const { data: orderItemsData, error: orderItemsError } = await supabaseClient
                .from('order_items') // ★テーブル名を 'order_items' に修正
                .insert(orderItemsToInsert)
                .select();

            if (orderItemsError) {
                // ★ここを修正しました
                throw new Error(`注文明細登録エラー: ${orderItemsError.message || '不明なエラー'}`);
            }
            console.log('order_items テーブルに登録成功:', orderItemsData);

            orderSuccess = true;

        } catch (error) {
            console.error('注文処理全体でエラーが発生しました:', error);
            // ★ここを修正しました
            if (outputDiv) outputDiv.textContent = `注文処理中にエラーが発生しました: ${error.message}`;
            // ★ここを修正しました
            alert(`注文処理中にエラーが発生しました: ${error.message}\nコンソールを確認してください。`);
        }

        if (orderSuccess) {
            // ★ここを修正しました
            alert(`ご注文ありがとうございます！\nあなたの呼び出し番号は 【 ${callNumber} 】 です。`);
            cartItems = [];
            displayCart();
            // ★ここを修正しました
            if (outputDiv) outputDiv.innerHTML = `ご注文が完了しました。<br>あなたの呼び出し番号は <strong>${callNumber}</strong> です！`;
            orderControlsDiv.style.display = 'none';
            menuNumberInput.value = '';
        }
    });
} else {
    console.warn("ID 'placeOrder' のボタンが見つかりません。HTMLに <button id='placeOrder'></button> を追加してください。");
}

// ページ読み込み時にカートを初期表示
document.addEventListener('DOMContentLoaded', displayCart);