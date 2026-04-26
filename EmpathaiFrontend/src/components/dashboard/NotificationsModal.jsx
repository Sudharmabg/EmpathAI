export default function NotificationsModal({ notifications }) {
    return (
        <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Notifications</h3>
            <div className="space-y-3 max-h-80 overflow-y-auto">
                {notifications.map((notif) => (
                    <div
                        key={notif.id}
                        className={'p-4 rounded-lg border ' + (!notif.read ? 'border-purple-300 bg-purple-50' : 'border-gray-200 bg-gray-50')}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold text-gray-900">{notif.title}</h4>
                            {!notif.read && <div className="w-2 h-2 bg-purple-600 rounded-full" />}
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{notif.time}</p>
                    </div>
                ))}
            </div>
            <button className="w-full mt-4 bg-black text-white py-2 rounded-lg hover:bg-gray-800">
                Mark All as Read
            </button>
        </div>
    )
}