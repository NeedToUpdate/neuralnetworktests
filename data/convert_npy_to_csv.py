import numpy
names = ['full_numpy_bitmap_fish','full_numpy_bitmap_star','full_numpy_bitmap_car',]

# 0 - fish
# 1 - star
# 2 - car

training_num = 10000
testing_num = 1000

lists = []
for i,filename in enumerate(names):
    data = numpy.load('./data/' + filename + '.npy')[:training_num,:]
    data = numpy.c_[numpy.full(data.shape[0],i),data]
    lists.append(data)
final_data = numpy.concatenate((lists))
numpy.random.shuffle(final_data)
numpy.savetxt("./data/quickdraw_data_train.csv", final_data, fmt='%i', delimiter=",")

test_lists = []
for i,filename in enumerate(names):
    data = numpy.load('./data/' + filename + '.npy')[training_num:training_num+testing_num,:]
    data = numpy.c_[numpy.full(data.shape[0],i),data]
    test_lists.append(data)
final_data = numpy.concatenate((test_lists))
numpy.random.shuffle(final_data)
numpy.savetxt("./data/quickdraw_data_test.csv", final_data, fmt='%i', delimiter=",")